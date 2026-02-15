import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import MudhroSymbol from '../../logos/MudhroSymbol.png';

interface Invoice {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  subTotalAmount: number;
  gst: number;
  totalAmount: number;
  currency: string;
  status: 'paid' | 'pending' | 'overdue';
  additionalNotes?: string;
  invoiceFileName?: string;
}

interface InvoiceItem {
  id: number;
  invoiceId: number;
  itemsId: number;
  quantity: number;
  unitPrice: number;
  itemName: string;
}

const InvoiceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      fetchInvoice();
      fetchInvoiceItems();
    }
  }, [id]);

  const fetchInvoice = async () => {
    try {
      const response = await api.get(`/client-portal/invoices/${id}`);
      if (response.data.success) {
        setInvoice(response.data.invoice);
      }
    } catch (err: any) {
      setError('Failed to load invoice');
      console.error('Error fetching invoice:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoiceItems = async () => {
    try {
      const response = await api.get(`/client-portal/invoices/${id}/items`);
      if (response.data.success) {
        setInvoiceItems(response.data.invoiceItems || []);
      }
    } catch (err: any) {
      console.error('Error fetching invoice items:', err);
    } finally {
      setItemsLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!id) return;

    setDownloading(true);
    try {
      const response = await api.get(`/client-portal/invoices/${id}/pdf`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = invoice?.invoiceFileName || `${invoice?.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError('Failed to download PDF');
      console.error('Error downloading PDF:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return { bg: '#d4edda', text: '#155724', border: '#c3e6cb', icon: '✓' };
      case 'overdue':
        return { bg: '#f8d7da', text: '#721c24', border: '#f5c6cb', icon: '⚠' };
      default:
        return { bg: '#fff3cd', text: '#856404', border: '#ffeaa7', icon: '⏳' };
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      }}>
        <div style={{ textAlign: 'center' }}>
      <div style={{
        width: '50px',
        height: '50px',
        border: '4px solid #e2e8f0',
        borderTop: '4px solid #1a1a1a',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 16px',
      }} />
          <p style={{ color: '#718096', fontSize: '16px' }}>Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        padding: '32px 20px',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '10px 20px',
              marginBottom: '20px',
              backgroundColor: '#1a1a1a',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2d2d2d';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#1a1a1a';
            }}
          >
            ← Back to Dashboard
          </button>
          <div style={{
            padding: '20px',
            backgroundColor: '#fed7d7',
            color: '#c53030',
            borderRadius: '12px',
            border: '1px solid #feb2b2',
          }}>
            {error || 'Invoice not found'}
          </div>
        </div>
      </div>
    );
  }

  const gstAmount = (invoice.subTotalAmount * invoice.gst) / 100;
  const statusStyle = getStatusColor(invoice.status);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
      padding: '32px 20px',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <img
              src={MudhroSymbol}
              alt="Mudhro"
              style={{
                height: '56px',
                width: '56px',
                objectFit: 'contain',
              }}
            />
            <div>
              <h1 style={{
                margin: 0,
                fontSize: '28px',
                fontWeight: '700',
                color: '#1a202c',
                letterSpacing: '-0.5px',
              }}>
                Invoice Details
              </h1>
              <p style={{
                margin: '4px 0 0 0',
                fontSize: '16px',
                color: '#718096',
              }}>
                {invoice.invoiceNumber}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                padding: '10px 20px',
                backgroundColor: 'white',
                color: '#4a5568',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#667eea';
                e.currentTarget.style.color = '#667eea';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.color = '#4a5568';
              }}
            >
              ← Back
            </button>
            <button
              onClick={handleLogout}
              style={{
                padding: '10px 20px',
                backgroundColor: 'white',
                color: '#1a1a1a',
                border: '2px solid #1a1a1a',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#1a1a1a';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.color = '#1a1a1a';
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Invoice Card */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
          border: '1px solid #e2e8f0',
          marginBottom: '24px',
        }}>
          {/* Invoice Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'start',
            marginBottom: '40px',
            flexWrap: 'wrap',
            gap: '20px',
            paddingBottom: '32px',
            borderBottom: '2px solid #e2e8f0',
          }}>
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
              }}>
                <h2 style={{
                  margin: 0,
                  fontSize: '32px',
                  fontWeight: '700',
                  color: '#1a202c',
                }}>
                  {invoice.invoiceNumber}
                </h2>
                <span style={{
                  padding: '6px 16px',
                  backgroundColor: statusStyle.bg,
                  color: statusStyle.text,
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  border: `1px solid ${statusStyle.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  <span>{statusStyle.icon}</span>
                  {invoice.status}
                </span>
              </div>
              <div style={{
                display: 'flex',
                gap: '32px',
                flexWrap: 'wrap',
              }}>
                <div>
                  <span style={{
                    fontSize: '12px',
                    color: '#718096',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    Invoice Date
                  </span>
                  <p style={{
                    margin: '8px 0 0 0',
                    fontSize: '16px',
                    color: '#2d3748',
                    fontWeight: '600',
                  }}>
                    {new Date(invoice.invoiceDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <span style={{
                    fontSize: '12px',
                    color: '#718096',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    Due Date
                  </span>
                  <p style={{
                    margin: '8px 0 0 0',
                    fontSize: '16px',
                    color: '#2d3748',
                    fontWeight: '600',
                  }}>
                    {new Date(invoice.dueDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Items Table */}
          {!itemsLoading && invoiceItems.length > 0 && (
            <div style={{ marginBottom: '40px' }}>
              <h3 style={{
                marginBottom: '20px',
                fontSize: '20px',
                fontWeight: '700',
                color: '#1a202c',
              }}>
                Items
              </h3>
              <div style={{
                overflowX: 'auto',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                }}>
                  <thead>
                    <tr style={{
                      backgroundColor: '#f7fafc',
                      borderBottom: '2px solid #e2e8f0',
                    }}>
                      <th style={{
                        padding: '16px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#718096',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>
                        Description
                      </th>
                      <th style={{
                        padding: '16px',
                        textAlign: 'right',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#718096',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>
                        Quantity
                      </th>
                      <th style={{
                        padding: '16px',
                        textAlign: 'right',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#718096',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>
                        Unit Price
                      </th>
                      <th style={{
                        padding: '16px',
                        textAlign: 'right',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#718096',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceItems.map((item, index) => {
                      const itemTotal = item.quantity * item.unitPrice;
                      return (
                        <tr
                          key={item.id}
                          style={{
                            borderBottom: index < invoiceItems.length - 1 ? '1px solid #e2e8f0' : 'none',
                            backgroundColor: index % 2 === 0 ? 'white' : '#f7fafc',
                          }}
                        >
                          <td style={{
                            padding: '16px',
                            fontSize: '15px',
                            color: '#2d3748',
                            fontWeight: '500',
                          }}>
                            {item.itemName}
                          </td>
                          <td style={{
                            padding: '16px',
                            textAlign: 'right',
                            fontSize: '15px',
                            color: '#4a5568',
                          }}>
                            {item.quantity.toLocaleString()}
                          </td>
                          <td style={{
                            padding: '16px',
                            textAlign: 'right',
                            fontSize: '15px',
                            color: '#4a5568',
                          }}>
                            {invoice.currency} {item.unitPrice.toLocaleString()}
                          </td>
                          <td style={{
                            padding: '16px',
                            textAlign: 'right',
                            fontSize: '15px',
                            fontWeight: '600',
                            color: '#1a202c',
                          }}>
                            {invoice.currency} {itemTotal.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Totals Section */}
          <div style={{
            marginTop: '40px',
            paddingTop: '32px',
            borderTop: '2px solid #e2e8f0',
          }}>
            <div style={{
              maxWidth: '400px',
              marginLeft: 'auto',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}>
                <span style={{
                  fontSize: '15px',
                  color: '#718096',
                  fontWeight: '500',
                }}>
                  Subtotal
                </span>
                <span style={{
                  fontSize: '15px',
                  color: '#2d3748',
                  fontWeight: '600',
                }}>
                  {invoice.currency} {invoice.subTotalAmount.toLocaleString()}
                </span>
              </div>
              {invoice.gst > 0 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                }}>
                  <span style={{
                    fontSize: '15px',
                    color: '#718096',
                    fontWeight: '500',
                  }}>
                    GST ({invoice.gst}%)
                  </span>
                  <span style={{
                    fontSize: '15px',
                    color: '#2d3748',
                    fontWeight: '600',
                  }}>
                    {invoice.currency} {gstAmount.toLocaleString()}
                  </span>
                </div>
              )}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '16px',
                borderTop: '2px solid #e2e8f0',
                marginTop: '16px',
              }}>
                <span style={{
                  fontSize: '18px',
                  color: '#1a202c',
                  fontWeight: '700',
                }}>
                  Total
                </span>
                <span style={{
                  fontSize: '24px',
                  color: '#1a1a1a',
                  fontWeight: '700',
                }}>
                  {invoice.currency} {invoice.totalAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          {invoice.additionalNotes && (
            <div style={{
              marginTop: '40px',
              padding: '24px',
              backgroundColor: '#f7fafc',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
            }}>
              <h3 style={{
                marginBottom: '12px',
                fontSize: '16px',
                fontWeight: '700',
                color: '#1a202c',
              }}>
                Notes
              </h3>
              <p style={{
                margin: 0,
                fontSize: '15px',
                color: '#4a5568',
                lineHeight: '1.6',
              }}>
                {invoice.additionalNotes}
              </p>
            </div>
          )}

          {/* Download PDF Button */}
          <div style={{
            marginTop: '40px',
            paddingTop: '32px',
            borderTop: '2px solid #e2e8f0',
            textAlign: 'center',
          }}>
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              style={{
                padding: '16px 32px',
                background: downloading
                  ? '#cbd5e0'
                  : '#1a1a1a',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: downloading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                boxShadow: downloading
                  ? 'none'
                  : '0 4px 12px rgba(0, 0, 0, 0.2)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => {
                if (!downloading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.3)';
                  e.currentTarget.style.backgroundColor = '#2d2d2d';
                }
              }}
              onMouseLeave={(e) => {
                if (!downloading) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
                  e.currentTarget.style.backgroundColor = '#1a1a1a';
                }
              }}
            >
              {downloading ? (
                <>
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <span>📥</span>
                  <span>Download PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default InvoiceDetail;
