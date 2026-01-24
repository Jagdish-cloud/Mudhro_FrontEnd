import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, X, ChevronLeft, ChevronRight, Loader2, Info } from 'lucide-react';
import SignaturePad from './SignaturePad';
import { agreementService, AgreementCreateData, Agreement } from '@/lib/services/agreementService';
import { clientService, Client } from '@/lib/services/clientService';
import { authService } from '@/lib/auth';
import { toast } from 'sonner';
import { getFileUrl } from '@/lib/services/fileStorageService';
import { formatCurrency, Currency } from '@/lib/currency';

interface AgreementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  selectedClientIds: number[];
  onComplete?: () => void;
  existingAgreement?: Agreement | null;
  onSaveProject?: () => Promise<number | null>; // Callback to save project if it doesn't exist yet
  projectData?: { budget?: number; startDate?: string; endDate?: string } | null; // Project data for auto-filling
}

const STEPS = [
  { id: 1, name: 'Party Details', title: 'Party Details' },
  { id: 2, name: 'Scope of Work', title: 'Scope of Work' },
  { id: 3, name: 'Timeline & Milestones', title: 'Timeline & Milestones' },
  { id: 4, name: 'Payment Terms', title: 'Payment Terms' },
  { id: 5, name: 'Revisions', title: 'Revisions' },
  { id: 6, name: 'Legal Details', title: 'Legal Details' },
  { id: 7, name: 'Service Provider Signature', title: 'Service Provider Signature' },
];

const AgreementModal = ({
  open,
  onOpenChange,
  projectId,
  selectedClientIds,
  onComplete,
  existingAgreement,
  onSaveProject,
  projectData,
}: AgreementModalProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const user = authService.getCurrentUser();
  const userCurrency = (user?.currency as Currency) || 'INR';

  const [formData, setFormData] = useState<Partial<AgreementCreateData>>({
    projectId,
    serviceProviderName: user?.fullName || '',
    agreementDate: new Date().toISOString().split('T')[0],
    serviceType: '',
    startDate: '',
    endDate: '',
    duration: undefined,
    durationUnit: 'days',
    numberOfRevisions: 0,
    jurisdiction: '',
    deliverables: [''],
    paymentStructure: '50-50',
    paymentMethod: '',
    paymentMilestones: [],
    serviceProviderSignature: {
      signerName: user?.fullName || '',
      signatureImage: '',
    },
  });

  useEffect(() => {
    if (open) {
      loadClients();
      if (existingAgreement) {
        loadExistingAgreement(existingAgreement);
      } else {
        resetForm();
      }
    }
  }, [open, existingAgreement, projectData]);

  const loadClients = async () => {
    try {
      const allClients = await clientService.getClients();
      setClients(allClients || []);
    } catch (error) {
      console.error('Failed to load clients', error);
    }
  };

  const loadExistingAgreement = async (agreement: Agreement) => {
    // Load signature image if it exists
    let signatureImage = '';
    const serviceProviderSig = agreement.signatures.find(s => s.signerType === 'service_provider');
    if (serviceProviderSig?.signatureImagePath) {
      try {
        // Fetch signature image from blob storage
        // The signature path format is: Signatures/{projectId}/{fileName}
        signatureImage = await getFileUrl('Signatures', agreement.projectId, {
          signaturePath: serviceProviderSig.signatureImagePath,
          expiresInMinutes: 60,
        });
      } catch (error) {
        console.error('Failed to load signature image:', error);
        // Continue without signature image - user can upload a new one
      }
    }

    setFormData({
      projectId: agreement.projectId,
      serviceProviderName: agreement.serviceProviderName,
      agreementDate: typeof agreement.agreementDate === 'string' 
        ? agreement.agreementDate.split('T')[0] 
        : new Date(agreement.agreementDate).toISOString().split('T')[0],
      serviceType: agreement.serviceType,
      startDate: agreement.startDate 
        ? (typeof agreement.startDate === 'string' 
          ? agreement.startDate.split('T')[0] 
          : new Date(agreement.startDate).toISOString().split('T')[0])
        : '',
      endDate: agreement.endDate
        ? (typeof agreement.endDate === 'string'
          ? agreement.endDate.split('T')[0]
          : new Date(agreement.endDate).toISOString().split('T')[0])
        : '',
      duration: agreement.duration,
      durationUnit: agreement.durationUnit,
      numberOfRevisions: agreement.numberOfRevisions,
      jurisdiction: agreement.jurisdiction || '',
      deliverables: agreement.deliverables.length > 0
        ? agreement.deliverables.map(d => d.description)
        : [''],
      paymentStructure: agreement.paymentTerms.paymentStructure as any,
      paymentMethod: agreement.paymentTerms.paymentMethod || '',
      paymentMilestones: agreement.paymentTerms.milestones?.map(m => ({
        description: m.description,
        amount: m.amount,
        date: m.date || '',
      })) || [],
      serviceProviderSignature: {
        signerName: serviceProviderSig?.signerName || user?.fullName || '',
        signatureImage,
      },
    });
  };

  const resetForm = () => {
    // Auto-fill dates from project data if available
    const startDate = projectData?.startDate 
      ? (typeof projectData.startDate === 'string' 
        ? projectData.startDate.split('T')[0] 
        : new Date(projectData.startDate).toISOString().split('T')[0])
      : '';
    const endDate = projectData?.endDate
      ? (typeof projectData.endDate === 'string'
        ? projectData.endDate.split('T')[0]
        : new Date(projectData.endDate).toISOString().split('T')[0])
      : '';
    
    // Calculate duration if both dates are available
    let duration: number | undefined;
    let durationUnit: 'days' | 'weeks' | 'months' = 'days';
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 7) {
        duration = diffDays;
        durationUnit = 'days';
      } else if (diffDays < 30) {
        duration = Math.round(diffDays / 7);
        durationUnit = 'weeks';
      } else {
        duration = Math.round(diffDays / 30);
        durationUnit = 'months';
      }
    }
    
    setFormData({
      projectId,
      serviceProviderName: user?.fullName || '',
      agreementDate: new Date().toISOString().split('T')[0],
      serviceType: '',
      startDate,
      endDate,
      duration,
      durationUnit,
      numberOfRevisions: 0,
      jurisdiction: '',
      deliverables: [''],
      paymentStructure: '50-50',
      paymentMethod: '',
      paymentMilestones: [],
      serviceProviderSignature: {
        signerName: user?.fullName || '',
        signatureImage: '',
      },
    });
    setCurrentStep(1);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.serviceProviderName || !formData.agreementDate) {
          toast.error('Please fill in all required fields');
          return false;
        }
        return true;
      case 2:
        if (!formData.serviceType) {
          toast.error('Service type is required');
          return false;
        }
        // Deliverables are optional - no validation needed
        return true;
      case 3:
        // Timeline is optional but if provided, validate
        if (formData.startDate && formData.endDate) {
          const start = new Date(formData.startDate);
          const end = new Date(formData.endDate);
          if (end < start) {
            toast.error('End date must be after start date');
            return false;
          }
        }
        return true;
      case 4:
        if (!formData.paymentStructure) {
          toast.error('Payment structure is required');
          return false;
        }
        if (formData.paymentStructure === 'milestone-based') {
          if (!formData.paymentMilestones || formData.paymentMilestones.length === 0) {
            toast.error('At least one payment milestone is required');
            return false;
          }
          if (formData.paymentMilestones.some(m => !m.description || !m.amount || !m.date)) {
            toast.error('All milestones must have description, amount, and date');
            return false;
          }
        }
        return true;
      case 5:
        if (formData.numberOfRevisions === undefined || formData.numberOfRevisions < 0) {
          toast.error('Number of revisions must be 0 or greater');
          return false;
        }
        return true;
      case 6:
        // Jurisdiction is optional
        return true;
      case 7:
        if (!formData.serviceProviderSignature?.signerName) {
          toast.error('Signer name is required');
          return false;
        }
        if (!formData.serviceProviderSignature?.signatureImage) {
          toast.error('Signature is required');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < STEPS.length) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    // Validate all steps
    for (let i = 1; i <= STEPS.length; i++) {
      if (!validateStep(i)) {
        setCurrentStep(i);
        return;
      }
    }

    // Show preview before saving
    setShowPreview(true);
  };

  const handleConfirmSave = async () => {
    setShowPreview(false);
    setSaving(true);
    try {
      // If project doesn't exist yet (projectId is 0 or negative), save it first
      let finalProjectId = formData.projectId!;
      if (finalProjectId <= 0 && onSaveProject) {
        const savedProjectId = await onSaveProject();
        if (!savedProjectId) {
          toast.error('Failed to save project. Please save the project first.');
          setSaving(false);
          return;
        }
        finalProjectId = savedProjectId;
        setFormData({ ...formData, projectId: finalProjectId });
      }

      // Filter out empty deliverables
      const deliverables = formData.deliverables?.filter(d => d.trim()) || [];

      const agreementData: AgreementCreateData = {
        projectId: finalProjectId,
        serviceProviderName: formData.serviceProviderName!,
        agreementDate: formData.agreementDate!,
        serviceType: formData.serviceType!,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        duration: formData.duration,
        durationUnit: formData.durationUnit,
        numberOfRevisions: formData.numberOfRevisions || 0,
        jurisdiction: formData.jurisdiction,
        deliverables,
        paymentStructure: formData.paymentStructure!,
        paymentMethod: formData.paymentMethod,
        paymentMilestones: formData.paymentMilestones,
        serviceProviderSignature: formData.serviceProviderSignature!,
      };

      let savedAgreement;
      if (existingAgreement) {
        savedAgreement = await agreementService.updateAgreement(existingAgreement.id, agreementData);
        toast.success('Agreement updated successfully');
      } else {
        savedAgreement = await agreementService.createAgreement(agreementData);
        toast.success('Agreement created successfully');
      }

      // Automatically send emails to selected clients if there are any
      if (savedAgreement && selectedClientIds.length > 0) {
        setSending(true);
        try {
          await agreementService.sendAgreementToClients(
            savedAgreement.id,
            selectedClientIds
          );
          toast.success(`Agreement sent to ${selectedClientIds.length} client(s) successfully`);
        } catch (error: any) {
          console.error('Error sending agreement to clients:', error);
          toast.error('Agreement saved but failed to send emails. You can send them later.');
        } finally {
          setSending(false);
        }
      }

      if (onComplete) {
        onComplete();
      }
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving agreement:', error);
      toast.error(error.message || 'Failed to save agreement');
    } finally {
      setSaving(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label>Service Provider Name *</Label>
              <Input
                value={formData.serviceProviderName || ''}
                onChange={(e) => setFormData({ ...formData, serviceProviderName: e.target.value })}
                placeholder="Your name or company name"
              />
            </div>
            <div>
              <Label>Agreement Date *</Label>
              <Input
                type="date"
                value={typeof formData.agreementDate === 'string' ? formData.agreementDate : (formData.agreementDate ? new Date(formData.agreementDate).toISOString().split('T')[0] : '')}
                onChange={(e) => setFormData({ ...formData, agreementDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Selected Clients</Label>
              <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                {selectedClientIds.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No clients selected</p>
                ) : (
                  clients
                    .filter(c => selectedClientIds.includes(c.id))
                    .map(client => (
                      <div key={client.id} className="text-sm">
                        {client.fullName}
                        {client.organization && (
                          <span className="text-muted-foreground ml-2">({client.organization})</span>
                        )}
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <Label>Service Type *</Label>
              <Input
                value={formData.serviceType || ''}
                onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                placeholder="e.g., Website Development, Graphic Design, Consulting"
              />
            </div>
            <div>
              <Label>Deliverables</Label>
              <div className="space-y-2">
                {(formData.deliverables || ['']).map((deliverable, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={deliverable}
                      onChange={(e) => {
                        const newDeliverables = [...(formData.deliverables || [])];
                        newDeliverables[index] = e.target.value;
                        setFormData({ ...formData, deliverables: newDeliverables });
                      }}
                      placeholder={`Deliverable ${index + 1}`}
                    />
                    {(formData.deliverables || []).length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const newDeliverables = [...(formData.deliverables || [])];
                          newDeliverables.splice(index, 1);
                          setFormData({ ...formData, deliverables: newDeliverables });
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      deliverables: [...(formData.deliverables || []), ''],
                    });
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Deliverable
                </Button>
              </div>
            </div>
          </div>
        );

      case 3:
        // Calculate duration and available units based on dates
        const calculateDuration = () => {
          if (!formData.startDate || !formData.endDate) return { duration: undefined, unit: 'days' as const, availableUnits: ['days', 'weeks', 'months'] };
          
          const start = new Date(formData.startDate);
          const end = new Date(formData.endDate);
          const diffTime = Math.abs(end.getTime() - start.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          let availableUnits: ('days' | 'weeks' | 'months')[] = [];
          let duration: number | undefined;
          let unit: 'days' | 'weeks' | 'months' = 'days';
          
          if (diffDays < 7) {
            availableUnits = ['days'];
            duration = diffDays;
            unit = 'days';
          } else if (diffDays < 30) {
            availableUnits = ['days', 'weeks'];
            duration = Math.round(diffDays / 7);
            unit = 'weeks';
          } else {
            availableUnits = ['days', 'weeks', 'months'];
            duration = Math.round(diffDays / 30);
            unit = 'months';
          }
          
          return { duration, unit, availableUnits };
        };
        
        const durationInfo = calculateDuration();
        const availableUnits = durationInfo.availableUnits;
        
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={typeof formData.startDate === 'string' ? formData.startDate : (formData.startDate ? new Date(formData.startDate).toISOString().split('T')[0] : '')}
                  onChange={(e) => {
                    const newStartDate = e.target.value;
                    setFormData({ ...formData, startDate: newStartDate });
                    // Auto-calculate duration if end date exists
                    if (newStartDate && formData.endDate) {
                      const start = new Date(newStartDate);
                      const end = new Date(formData.endDate);
                      const diffTime = Math.abs(end.getTime() - start.getTime());
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      
                      if (diffDays < 7) {
                        setFormData(prev => ({ ...prev, startDate: newStartDate, duration: diffDays, durationUnit: 'days' }));
                      } else if (diffDays < 30) {
                        setFormData(prev => ({ ...prev, startDate: newStartDate, duration: Math.round(diffDays / 7), durationUnit: 'weeks' }));
                      } else {
                        setFormData(prev => ({ ...prev, startDate: newStartDate, duration: Math.round(diffDays / 30), durationUnit: 'months' }));
                      }
                    }
                  }}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={typeof formData.endDate === 'string' ? formData.endDate : (formData.endDate ? new Date(formData.endDate).toISOString().split('T')[0] : '')}
                  onChange={(e) => {
                    const newEndDate = e.target.value;
                    setFormData({ ...formData, endDate: newEndDate });
                    // Auto-calculate duration if start date exists
                    if (formData.startDate && newEndDate) {
                      const start = new Date(formData.startDate);
                      const end = new Date(newEndDate);
                      const diffTime = Math.abs(end.getTime() - start.getTime());
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      
                      if (diffDays < 7) {
                        setFormData(prev => ({ ...prev, endDate: newEndDate, duration: diffDays, durationUnit: 'days' }));
                      } else if (diffDays < 30) {
                        setFormData(prev => ({ ...prev, endDate: newEndDate, duration: Math.round(diffDays / 7), durationUnit: 'weeks' }));
                      } else {
                        setFormData(prev => ({ ...prev, endDate: newEndDate, duration: Math.round(diffDays / 30), durationUnit: 'months' }));
                      }
                    }
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Duration Unit</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={formData.durationUnit || 'days'}
                  onChange={(e) => {
                    const newUnit = e.target.value as 'days' | 'weeks' | 'months';
                    setFormData({ ...formData, durationUnit: newUnit });
                    // Recalculate duration when unit changes
                    if (formData.startDate && formData.endDate) {
                      const start = new Date(formData.startDate);
                      const end = new Date(formData.endDate);
                      const diffTime = Math.abs(end.getTime() - start.getTime());
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      
                      if (newUnit === 'days') {
                        setFormData(prev => ({ ...prev, duration: diffDays, durationUnit: newUnit }));
                      } else if (newUnit === 'weeks') {
                        setFormData(prev => ({ ...prev, duration: Math.round(diffDays / 7), durationUnit: newUnit }));
                      } else {
                        setFormData(prev => ({ ...prev, duration: Math.round(diffDays / 30), durationUnit: newUnit }));
                      }
                    }
                  }}
                  disabled={availableUnits.length === 0}
                >
                  {availableUnits.includes('days') && <option value="days">Days</option>}
                  {availableUnits.includes('weeks') && <option value="weeks">Weeks</option>}
                  {availableUnits.includes('months') && <option value="months">Months</option>}
                </select>
              </div>
              <div>
                <Label>Duration</Label>
                <Input
                  type="number"
                  value={formData.duration || ''}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || undefined })}
                  placeholder="Auto-calculated"
                  readOnly
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div>
              <Label>Payment Structure *</Label>
              <RadioGroup
                value={formData.paymentStructure || '50-50'}
                onValueChange={(value) => setFormData({ ...formData, paymentStructure: value as any })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="50-50" id="50-50" />
                  <Label htmlFor="50-50" className="cursor-pointer flex-1">50% Upfront & 50% Upon Completion</Label>
                  {projectData?.budget && formData.paymentStructure === '50-50' && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Info className="h-4 w-4" />
                      <span>
                        {formatCurrency(projectData.budget * 0.5, userCurrency)} upfront, {formatCurrency(projectData.budget * 0.5, userCurrency)} on completion
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="100-upfront" id="100-upfront" />
                  <Label htmlFor="100-upfront" className="cursor-pointer">100% Upfront</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="100-completion" id="100-completion" />
                  <Label htmlFor="100-completion" className="cursor-pointer">100% Upon Completion</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="milestone-based" id="milestone-based" />
                  <Label htmlFor="milestone-based" className="cursor-pointer">Milestone-Based Payments</Label>
                </div>
              </RadioGroup>
            </div>
            <div>
              <Label>Payment Method</Label>
              <Input
                value={formData.paymentMethod || ''}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                placeholder="e.g., Bank Transfer, UPI, PayPal"
              />
            </div>
            {formData.paymentStructure === 'milestone-based' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Payment Milestones *</Label>
                  {projectData?.budget && (
                    <div className="text-sm text-muted-foreground">
                      Total Budget: {formatCurrency(projectData.budget, userCurrency)} | 
                      Remaining: {formatCurrency(
                        projectData.budget - (formData.paymentMilestones?.reduce((sum, m) => sum + (m.amount || 0), 0) || 0),
                        userCurrency
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  {(formData.paymentMilestones || []).map((milestone, index) => {
                    const totalUsed = formData.paymentMilestones?.reduce((sum, m, i) => {
                      if (i < index) return sum + (m.amount || 0);
                      return sum;
                    }, 0) || 0;
                    const remaining = projectData?.budget ? projectData.budget - totalUsed : undefined;
                    
                    return (
                      <div key={index} className="space-y-2 border rounded-md p-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <Label>Description *</Label>
                            <Input
                              value={milestone.description}
                              onChange={(e) => {
                                const newMilestones = [...(formData.paymentMilestones || [])];
                                newMilestones[index].description = e.target.value;
                                setFormData({ ...formData, paymentMilestones: newMilestones });
                              }}
                              placeholder="Milestone description"
                            />
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <Label>Amount *</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={milestone.amount}
                                onChange={(e) => {
                                  const newMilestones = [...(formData.paymentMilestones || [])];
                                  const newAmount = parseFloat(e.target.value) || 0;
                                  if (projectData?.budget && newAmount > (remaining || 0)) {
                                    toast.error(`Amount exceeds remaining budget of ${formatCurrency(remaining || 0, userCurrency)}`);
                                    return;
                                  }
                                  newMilestones[index].amount = newAmount;
                                  setFormData({ ...formData, paymentMilestones: newMilestones });
                                }}
                                placeholder="Amount"
                                max={remaining}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const newMilestones = [...(formData.paymentMilestones || [])];
                                newMilestones.splice(index, 1);
                                setFormData({ ...formData, paymentMilestones: newMilestones });
                              }}
                              className="mt-6"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label>Date *</Label>
                          <Input
                            type="date"
                            value={milestone.date || ''}
                            onChange={(e) => {
                              const newMilestones = [...(formData.paymentMilestones || [])];
                              newMilestones[index].date = e.target.value;
                              setFormData({ ...formData, paymentMilestones: newMilestones });
                            }}
                            placeholder="Milestone date"
                            className="w-full"
                          />
                        </div>
                        {remaining !== undefined && (
                          <p className="text-xs text-muted-foreground">
                            Remaining after this milestone: {formatCurrency(remaining - (milestone.amount || 0), userCurrency)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const totalUsed = formData.paymentMilestones?.reduce((sum, m) => sum + (m.amount || 0), 0) || 0;
                      const remaining = projectData?.budget ? projectData.budget - totalUsed : 0;
                      if (projectData?.budget && remaining <= 0) {
                        toast.error('No budget remaining for additional milestones');
                        return;
                      }
                      setFormData({
                        ...formData,
                        paymentMilestones: [...(formData.paymentMilestones || []), { description: '', amount: 0, date: '' }],
                      });
                    }}
                    disabled={projectData?.budget ? (projectData.budget - (formData.paymentMilestones?.reduce((sum, m) => sum + (m.amount || 0), 0) || 0)) <= 0 : false}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Milestone
                  </Button>
                </div>
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div>
              <Label>Number of Revisions *</Label>
              <Input
                type="number"
                min="0"
                value={formData.numberOfRevisions || 0}
                onChange={(e) => setFormData({ ...formData, numberOfRevisions: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground mt-1">
                A revision means minor adjustments within the agreed scope. Major changes will be billed separately.
              </p>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <div>
              <Label>Jurisdiction</Label>
              <Input
                value={formData.jurisdiction || ''}
                onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })}
                placeholder="e.g., India, United States"
              />
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-4">
            <SignaturePad
              value={formData.serviceProviderSignature?.signatureImage}
              onChange={(base64) =>
                setFormData({
                  ...formData,
                  serviceProviderSignature: {
                    ...formData.serviceProviderSignature!,
                    signatureImage: base64,
                  },
                })
              }
              signerName={formData.serviceProviderSignature?.signerName}
              onSignerNameChange={(name) =>
                setFormData({
                  ...formData,
                  serviceProviderSignature: {
                    ...formData.serviceProviderSignature!,
                    signerName: name,
                  },
                })
              }
              required
            />
          </div>
        );

      default:
        return null;
    }
  };

  const renderPreview = () => {
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
      if (!formData.duration) return '';
      const unit = formData.durationUnit === 'weeks' ? 'Weeks' : 
                   formData.durationUnit === 'months' ? 'Months' : 'Days';
      return `${formData.duration} ${unit}`;
    };

    return (
      <div className="space-y-6 text-sm leading-relaxed max-h-[60vh] overflow-y-auto">
        {/* Introduction */}
        <div>
          <p className="mb-4">
            This Agreement is entered into between <strong>{formData.serviceProviderName}</strong> ("Service Provider") 
            and <strong>Client</strong> on <strong>{formatDate(formData.agreementDate)}</strong>.
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
              {formData.serviceType}
            </p>
            {formData.deliverables && formData.deliverables.length > 0 && (
              <div>
                <strong>Deliverables Include:</strong>
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  {formData.deliverables.filter(d => d.trim()).map((d, i) => (
                    <li key={i}>{d}</li>
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
            {formData.startDate && (
              <li>Project Start Date: <strong>{formatDate(formData.startDate)}</strong></li>
            )}
            {formData.endDate && (
              <li>Estimated Completion Date: <strong>{formatDate(formData.endDate)}</strong></li>
            )}
            {formData.duration && (
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
            <li className={formData.paymentStructure === '50-50' ? 'font-semibold' : ''}>
              {formData.paymentStructure === '50-50' ? '☑' : '☐'} 50% Upfront & 50% Upon Completion
            </li>
            <li className={formData.paymentStructure === '100-upfront' ? 'font-semibold' : ''}>
              {formData.paymentStructure === '100-upfront' ? '☑' : '☐'} 100% Upfront
            </li>
            <li className={formData.paymentStructure === '100-completion' ? 'font-semibold' : ''}>
              {formData.paymentStructure === '100-completion' ? '☑' : '☐'} 100% Upon Completion
            </li>
            {formData.paymentStructure === 'milestone-based' && formData.paymentMilestones && formData.paymentMilestones.length > 0 && (
              <li className="font-semibold">
                ☑ Milestone-Based Payments:
                <ul className="list-disc list-inside ml-4 mt-1">
                  {formData.paymentMilestones.map((m, i) => (
                    <li key={i}>
                      {m.description} – {new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: userCurrency,
                      }).format(m.amount)}
                      {m.date && ` (Due: ${formatDate(m.date)})`}
                    </li>
                  ))}
                </ul>
              </li>
            )}
          </ul>
          {formData.paymentMethod && (
            <p className="mt-3">
              Payments must be made via: <strong>{formData.paymentMethod}</strong>
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
            The Agreement includes up to <strong>{formData.numberOfRevisions || 0}</strong> revisions.
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
            <strong>{formData.jurisdiction || '[Jurisdiction / Country]'}</strong>, unless otherwise agreed.
          </p>
          <div className="border-t border-muted-foreground/25 my-4"></div>
        </div>

        {/* 11. Acceptance & E-Signature */}
        <div>
          <h3 className="font-semibold text-base mb-3">11. Acceptance & E-Signature</h3>
          <p className="italic text-muted-foreground mb-4">
            By proceeding, both parties confirm that they have read, understood, and agreed to the terms of this Agreement.
          </p>
          <div className="space-y-4">
            <div>
              <p className="font-semibold mb-2">Service Provider Signature:</p>
              {formData.serviceProviderSignature?.signatureImage ? (
                <div className="border rounded p-2 inline-block">
                  <img 
                    src={formData.serviceProviderSignature.signatureImage} 
                    alt="Service Provider Signature" 
                    className="max-w-[200px] h-auto"
                  />
                </div>
              ) : (
                <p className="text-muted-foreground">No signature provided</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Signed by: {formData.serviceProviderSignature?.signerName || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Full-screen loader overlay when sending emails */}
        {sending && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-lg">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Sending agreement to clients...</p>
            <p className="text-sm text-muted-foreground mt-2">
              Please wait while we send emails to {selectedClientIds.length} client(s)
            </p>
          </div>
        )}
        <DialogHeader>
          <DialogTitle>
            {existingAgreement ? 'Edit Agreement' : 'Create Agreement'} - {STEPS[currentStep - 1].title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Progress indicator */}
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
            <span>Step {currentStep} of {STEPS.length}</span>
            <div className="flex gap-1">
              {STEPS.map((step) => (
                <div
                  key={step.id}
                  className={`h-1 w-8 rounded ${
                    step.id <= currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>

          {renderStepContent()}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2 w-full sm:w-auto">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={saving || sending}
                className="flex-1 sm:flex-initial"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                {STEPS[currentStep - 2].name}
              </Button>
            )}
             {currentStep < STEPS.length ? (
               <Button
                 type="button"
                 onClick={handleNext}
                 disabled={saving || sending}
                 className="flex-1 sm:flex-initial"
               >
                 {STEPS[currentStep].name}
                 <ChevronRight className="h-4 w-4 ml-2" />
               </Button>
             ) : (
               <Button
                 type="button"
                 onClick={handleSave}
                 disabled={saving || sending}
                 className="flex-1 sm:flex-initial"
               >
                 Preview & Save Agreement
               </Button>
             )}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving || sending}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Preview Confirmation Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="w-[95vw] sm:w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview Agreement - Please Review Before Saving</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {renderPreview()}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPreview(false)}
              disabled={saving || sending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmSave}
              disabled={saving || sending}
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending to clients...
                </>
              ) : saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Confirm & Save Agreement'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default AgreementModal;
