import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import SignaturePad from '@/components/SignaturePad';
import { agreementService, Agreement } from '@/lib/services/agreementService';
import { toast } from 'sonner';
import { getFileUrl } from '@/lib/services/fileStorageService';

const ClientSignature = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [clientName, setClientName] = useState<string>('');
  const [expired, setExpired] = useState(false);
  const [signed, setSigned] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [signatureImage, setSignatureImage] = useState('');
  const [serviceProviderSignatureUrl, setServiceProviderSignatureUrl] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadAgreement();
    }
  }, [token]);

  const loadAgreement = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await agreementService.getAgreementByToken(token);
      setAgreement(response.agreement);
      setClientName(response.link.clientName || '[Client Name]');

      // Load service provider signature image if available
      const serviceProviderSig = response.agreement.signatures.find(s => s.signerType === 'service_provider');
      if (serviceProviderSig?.signatureImagePath) {
        try {
          const sigUrl = await getFileUrl('Signatures', response.agreement.projectId, {
            signaturePath: serviceProviderSig.signatureImagePath,
            expiresInMinutes: 60,
          });
          setServiceProviderSignatureUrl(sigUrl);
        } catch (error) {
          console.error('Failed to load service provider signature:', error);
        }
      }

      // Check if link is expired
      const expiresAt = new Date(response.link.expiresAt);
      const now = new Date();
      const daysRemaining = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      if (response.expired || daysRemaining <= 0) {
        setExpired(true);
        setCanEdit(false);
      } else if (response.link.status === 'client_signed') {
        setSigned(true);
        // Allow editing if within 2 days (link not expired)
        setCanEdit(true);
        // Load existing signature if available
        // The signature would be in the agreement data, but we need to fetch it
        // For now, we'll allow them to replace it
      } else {
        setSigned(false);
        setCanEdit(true);
      }
    } catch (error: any) {
      console.error('Error loading agreement:', error);
      
      // Check if it's an expired link (from response data or error message)
      const isExpired = error.expired || 
                       error.response?.data?.expired || 
                       error.message?.toLowerCase().includes('expired');
      
      if (isExpired) {
        setExpired(true);
        setCanEdit(false);
      } else if (error.message?.toLowerCase().includes('invalid token') || 
                 error.message?.toLowerCase().includes('not found') ||
                 error.response?.status === 404) {
        // Invalid token or agreement not found
        setAgreement(null);
      } else {
        // Other errors - show error message
        const errorMessage = error.response?.data?.message || error.message || 'Failed to load agreement';
        toast.error(errorMessage);
        // Only set agreement to null if it's a clear "not found" error
        if (errorMessage.toLowerCase().includes('not found') || 
            errorMessage.toLowerCase().includes('invalid token')) {
          setAgreement(null);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!signerName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (!signatureImage) {
      toast.error('Please provide your signature');
      return;
    }

    if (!token) return;

    setSubmitting(true);
    try {
      if (signed) {
        // Update existing signature
        await agreementService.updateClientSignature(token, {
          signerName,
          signatureImage,
        });
        toast.success('Signature updated successfully');
      } else {
        // Submit new signature
        const result = await agreementService.submitClientSignature(token, {
          signerName,
          signatureImage,
        });
        toast.success('Signature submitted successfully');
        setSigned(true);
        setCanEdit(false);

        // Download PDF if available
        if (result.pdfUrl) {
          try {
            // Create a temporary link and trigger download
            const link = document.createElement('a');
            link.href = result.pdfUrl;
            link.download = `Agreement-Signed-${new Date().toISOString().split('T')[0]}.pdf`;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success('PDF downloaded successfully');
          } catch (downloadError) {
            console.error('Error downloading PDF:', downloadError);
            // Don't show error to user, PDF was already sent via email
          }
        }
      }
    } catch (error: any) {
      console.error('Error submitting signature:', error);
      toast.error(error.message || 'Failed to submit signature');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading agreement...</p>
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <XCircle className="h-16 w-16 text-destructive mx-auto" />
              <h2 className="text-2xl font-semibold">Link Expired</h2>
              <p className="text-muted-foreground">
                This signature link has expired. Please contact the service provider for a new link.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!agreement) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
              <h2 className="text-2xl font-semibold">Agreement Not Found</h2>
              <p className="text-muted-foreground">
                The agreement you're looking for could not be found.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatDuration = (): string => {
    if (!agreement.duration) return '';
    const unit = agreement.durationUnit === 'weeks' ? 'Weeks' : 
                 agreement.durationUnit === 'months' ? 'Months' : 'Days';
    return `${agreement.duration} ${unit}`;
  };

  const getPaymentStructureText = (): string => {
    switch (agreement.paymentTerms.paymentStructure) {
      case '50-50':
        return '50% Upfront & 50% Upon Completion';
      case '100-upfront':
        return '100% Upfront';
      case '100-completion':
        return '100% Upon Completion';
      case 'milestone-based':
        return 'Milestone-Based Payments';
      default:
        return agreement.paymentTerms.paymentStructure;
    }
  };

  const getServiceProviderSignature = () => {
    return agreement.signatures.find(s => s.signerType === 'service_provider');
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Service Agreement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Agreement Content */}
            <div className="space-y-6 text-sm leading-relaxed">
              {/* Introduction */}
              <div>
                <p className="mb-4">
                  This Agreement is entered into between <strong>{agreement.serviceProviderName}</strong> ("Service Provider") 
                  and <strong>{clientName}</strong> ("Client") on <strong>{formatDate(agreement.agreementDate)}</strong>.
                </p>
                <div className="border-t border-muted-foreground/25 my-4"></div>
              </div>

              {/* 1. Scope of Work */}
              <div>
                <h3 className="font-semibold text-base mb-3">1. Scope of Work</h3>
                <p className="mb-3">
                  The Service Provider agrees to design and/or develop a website as per the following scope:
                </p>
                <div className="space-y-2 ml-4">
                  <p>
                    <strong>Service Type:</strong><br />
                    {agreement.serviceType}
                  </p>
                  {agreement.deliverables.length > 0 && (
                    <div>
                      <strong>Deliverables Include:</strong>
                      <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                        {agreement.deliverables.map((d, i) => (
                          <li key={i}>{d.description}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <p className="mt-3 italic text-muted-foreground">
                  Any additional features, integrations, or changes not explicitly listed above are outside the scope of this Agreement 
                  and may require a separate quotation or amendment.
                </p>
                <div className="border-t border-muted-foreground/25 my-4"></div>
              </div>

              {/* 2. Timeline & Milestones */}
              <div>
                <h3 className="font-semibold text-base mb-3">2. Timeline & Milestones</h3>
                <ul className="space-y-1 ml-4">
                  {agreement.startDate && (
                    <li>Project Start Date: <strong>{formatDate(agreement.startDate)}</strong></li>
                  )}
                  {agreement.endDate && (
                    <li>Estimated Completion Date: <strong>{formatDate(agreement.endDate)}</strong></li>
                  )}
                  {agreement.duration && (
                    <li>Total Duration: <strong>{formatDuration()}</strong></li>
                  )}
                </ul>
                <p className="mt-3 italic text-muted-foreground">
                  Timelines are dependent on timely feedback, approvals, and content provided by the Client. 
                  Delays caused by the Client may extend the project timeline accordingly.
                </p>
                <div className="border-t border-muted-foreground/25 my-4"></div>
              </div>

              {/* 3. Payment Terms */}
              <div>
                <h3 className="font-semibold text-base mb-3">3. Payment Terms</h3>
                <p className="mb-3">
                  The Client agrees to pay the Service Provider as per the selected payment structure:
                </p>
                <ul className="space-y-1 ml-4">
                  <li className={agreement.paymentTerms.paymentStructure === '50-50' ? 'font-semibold' : ''}>
                    {agreement.paymentTerms.paymentStructure === '50-50' ? '☑' : '☐'} 50% Upfront & 50% Upon Completion
                  </li>
                  <li className={agreement.paymentTerms.paymentStructure === '100-upfront' ? 'font-semibold' : ''}>
                    {agreement.paymentTerms.paymentStructure === '100-upfront' ? '☑' : '☐'} 100% Upfront
                  </li>
                  <li className={agreement.paymentTerms.paymentStructure === '100-completion' ? 'font-semibold' : ''}>
                    {agreement.paymentTerms.paymentStructure === '100-completion' ? '☑' : '☐'} 100% Upon Completion
                  </li>
                  {agreement.paymentTerms.paymentStructure === 'milestone-based' && agreement.paymentTerms.milestones && (
                    <li className="font-semibold">
                      ☑ Milestone-Based Payments:
                      <ul className="list-disc list-inside ml-4 mt-1">
                        {agreement.paymentTerms.milestones.map((m, i) => (
                          <li key={i}>
                            {m.description} – {new Intl.NumberFormat('en-IN', {
                              style: 'currency',
                              currency: 'INR',
                            }).format(m.amount)}
                            {m.date && ` (Due: ${formatDate(m.date)})`}
                          </li>
                        ))}
                      </ul>
                    </li>
                  )}
                </ul>
                {agreement.paymentTerms.paymentMethod && (
                  <p className="mt-3">
                    Payments must be made via: <strong>{agreement.paymentTerms.paymentMethod}</strong>
                  </p>
                )}
                <p className="mt-3 italic text-muted-foreground">
                  Work will commence only after receipt of any applicable upfront payment. 
                  Late payments may result in work being paused until payment is received.
                </p>
                <div className="border-t border-muted-foreground/25 my-4"></div>
              </div>

              {/* 4. Revisions */}
              <div>
                <h3 className="font-semibold text-base mb-3">4. Revisions</h3>
                <p className="mb-3">
                  The Agreement includes up to <strong>{agreement.numberOfRevisions}</strong> revisions.
                </p>
                <p className="italic text-muted-foreground">
                  A "revision" refers to minor design or content adjustments within the agreed scope. 
                  Major changes, redesigns, or scope expansions will be treated as additional work and billed separately.
                </p>
                <div className="border-t border-muted-foreground/25 my-4"></div>
              </div>

              {/* 5. Client Responsibilities */}
              <div>
                <h3 className="font-semibold text-base mb-3">5. Client Responsibilities</h3>
                <p className="mb-3">The Client agrees to:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Provide all required content, assets, and feedback in a timely manner</li>
                  <li>Review and approve deliverables within a reasonable timeframe</li>
                  <li>Ensure that any provided content does not infringe third-party rights</li>
                </ul>
                <p className="mt-3 italic text-muted-foreground">
                  Delays in client input may affect delivery timelines.
                </p>
                <div className="border-t border-muted-foreground/25 my-4"></div>
              </div>

              {/* 6. Ownership & Usage Rights */}
              <div>
                <h3 className="font-semibold text-base mb-3">6. Ownership & Usage Rights</h3>
                <p className="mb-3">
                  Upon full payment, the Client will receive ownership rights to the final approved deliverables.
                </p>
                <p className="italic text-muted-foreground">
                  The Service Provider retains the right to showcase the work in portfolios, case studies, or marketing materials 
                  unless otherwise agreed in writing.
                </p>
                <div className="border-t border-muted-foreground/25 my-4"></div>
              </div>

              {/* 7. Confidentiality */}
              <div>
                <h3 className="font-semibold text-base mb-3">7. Confidentiality</h3>
                <p className="italic text-muted-foreground">
                  Both parties agree to keep any confidential or sensitive information shared during the project strictly confidential 
                  and not disclose it to third parties without prior consent.
                </p>
                <div className="border-t border-muted-foreground/25 my-4"></div>
              </div>

              {/* 8. Termination */}
              <div>
                <h3 className="font-semibold text-base mb-3">8. Termination</h3>
                <p className="mb-3">
                  Either party may terminate this Agreement with written notice.
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Payments already made are non-refundable for work completed up to the termination date.</li>
                  <li>Any completed work up to termination will be handed over to the Client upon settlement of dues.</li>
                </ul>
                <div className="border-t border-muted-foreground/25 my-4"></div>
              </div>

              {/* 9. Limitation of Liability */}
              <div>
                <h3 className="font-semibold text-base mb-3">9. Limitation of Liability</h3>
                <p className="mb-3">The Service Provider shall not be liable for:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Loss of business, revenue, or profits</li>
                  <li>Issues arising from third-party tools, hosting providers, or platforms</li>
                  <li>Delays caused by client actions or external dependencies</li>
                </ul>
                <div className="border-t border-muted-foreground/25 my-4"></div>
              </div>

              {/* 10. Governing Law */}
              <div>
                <h3 className="font-semibold text-base mb-3">10. Governing Law</h3>
                <p className="italic text-muted-foreground">
                  This Agreement shall be governed by and interpreted in accordance with the laws applicable in{' '}
                  <strong>{agreement.jurisdiction || '[Jurisdiction / Country]'}</strong>, unless otherwise agreed.
                </p>
                <div className="border-t border-muted-foreground/25 my-4"></div>
              </div>

              {/* 11. Acceptance & E-Signature */}
              <div>
                <h3 className="font-semibold text-base mb-3">11. Acceptance & E-Signature</h3>
                <p className="mb-4 italic text-muted-foreground">
                  By proceeding, both parties confirm that they have read, understood, and agreed to the terms of this Agreement.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <p className="mb-2"><strong>Client Signature:</strong> ________</p>
                    <p><strong>Date:</strong> ________</p>
                  </div>
                  
                  <div>
                    <p className="mb-2"><strong>Service Provider Signature:</strong></p>
                    {getServiceProviderSignature() && (
                      <div className="mt-2 space-y-2">
                        {serviceProviderSignatureUrl && (
                          <div className="border border-muted-foreground/25 rounded p-2 bg-white inline-block">
                            <img
                              src={serviceProviderSignatureUrl}
                              alt="Service Provider Signature"
                              className="max-w-[200px] max-h-[100px] object-contain"
                            />
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Signed by: {getServiceProviderSignature()?.signerName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Date: {formatDate(getServiceProviderSignature()?.timestamp)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Signature Section */}
            {signed ? (
              <div className="border-t pt-6">
                <div className="flex items-center gap-2 text-green-600 mb-4">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">Agreement Signed</span>
                </div>
                {canEdit ? (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">
                      You can update your signature within 2 days of receiving this link. After that, please contact the service provider for changes.
                    </p>
                    <div className="space-y-4">
                      <SignaturePad
                        value={signatureImage}
                        onChange={setSignatureImage}
                        signerName={signerName}
                        onSignerNameChange={setSignerName}
                      />
                      <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                        {submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          'Update Signature'
                        )}
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground mb-4">
                    You have already signed this agreement. The link has expired, so changes are no longer allowed. If you need to make changes, please contact the service provider.
                  </p>
                )}
              </div>
            ) : (
              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">Your Signature</h3>
                <div className="space-y-4">
                  <SignaturePad
                    value={signatureImage}
                    onChange={setSignatureImage}
                    signerName={signerName}
                    onSignerNameChange={setSignerName}
                    required
                  />
                  <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Sign Agreement'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientSignature;
