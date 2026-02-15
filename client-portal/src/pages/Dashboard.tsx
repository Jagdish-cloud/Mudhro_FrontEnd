import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import MudhroSymbol from '../../logos/MudhroSymbol.png';

interface Invoice {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  currency: string;
  status: 'paid' | 'pending' | 'overdue';
}

interface ClientInfo {
  fullName: string;
  email: string;
  organization?: string;
}

const Dashboard = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [invoicesResponse, clientResponse] = await Promise.all([
        api.get('/client-portal/invoices'),
        api.get('/client-portal/invoices/info'),
      ]);

      if (invoicesResponse.data.success) {
        setInvoices(invoicesResponse.data.invoices || []);
      }

      if (clientResponse.data.success) {
        setClientInfo(clientResponse.data.client);
      }
    } catch (err: any) {
      setError('Failed to load data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return { bg: '#d4edda', text: '#155724', border: '#c3e6cb' };
      case 'overdue':
        return { bg: '#f8d7da', text: '#721c24', border: '#f5c6cb' };
      default:
        return { bg: '#fff3cd', text: '#856404', border: '#ffeaa7' };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return '✓';
      case 'overdue':
        return '⚠';
      default:
        return '⏳';
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
          <p style={{ color: '#718096', fontSize: '16px' }}>Loading your invoices...</p>
        </div>
      </div>
    );
  }

  const totalInvoices = invoices.length;
  const paidCount = invoices.filter((inv) => inv.status === 'paid').length;
  const pendingCount = invoices.filter((inv) => inv.status === 'pending').length;
  const overdueCount = invoices.filter((inv) => inv.status === 'overdue').length;
  const totalAmount = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const currency = invoices[0]?.currency || 'INR';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
      padding: '32px 20px',
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '40px',
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
                Invoice Portal
              </h1>
              {clientInfo && (
                <p style={{
                  margin: '4px 0 0 0',
                  fontSize: '16px',
                  color: '#4a4a4a',
                  fontWeight: '600',
                }}>
                  {clientInfo.organization || clientInfo.fullName}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '10px 20px',
              backgroundColor: 'white',
              color: '#1a1a1a',
              border: '2px solid #1a1a1a',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
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

        {error && (
          <div style={{
            padding: '16px',
            backgroundColor: '#fed7d7',
            color: '#c53030',
            borderRadius: '12px',
            marginBottom: '32px',
            border: '1px solid #feb2b2',
          }}>
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          marginBottom: '40px',
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
            border: '1px solid #e2e8f0',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '14px', color: '#718096', fontWeight: '600' }}>Total Invoices</span>
              <span style={{ fontSize: '24px' }}>📄</span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#1a202c' }}>{totalInvoices}</div>
          </div>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
            border: '1px solid #e2e8f0',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '14px', color: '#718096', fontWeight: '600' }}>Total Amount</span>
              <span style={{ fontSize: '24px' }}>💰</span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#1a202c' }}>
              {currency} {totalAmount.toLocaleString()}
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
            border: '1px solid #e2e8f0',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '14px', color: '#718096', fontWeight: '600' }}>Paid</span>
              <span style={{ fontSize: '24px' }}>✓</span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#1a1a1a' }}>{paidCount}</div>
          </div>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
            border: '1px solid #e2e8f0',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '14px', color: '#718096', fontWeight: '600' }}>Pending</span>
              <span style={{ fontSize: '24px' }}>⏳</span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#4a4a4a' }}>{pendingCount}</div>
          </div>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
            border: '1px solid #e2e8f0',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '14px', color: '#718096', fontWeight: '600' }}>Overdue</span>
              <span style={{ fontSize: '24px' }}>⚠</span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#1a1a1a' }}>{overdueCount}</div>
          </div>
        </div>

        {/* Invoices Section */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '32px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
          border: '1px solid #e2e8f0',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}>
            <h2 style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: '700',
              color: '#1a202c',
            }}>
              Your Invoices
            </h2>
            <span style={{
              padding: '6px 12px',
              backgroundColor: '#edf2f7',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#4a5568',
            }}>
              {invoices.length} {invoices.length === 1 ? 'invoice' : 'invoices'}
            </span>
          </div>

          {invoices.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#a0aec0',
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
              <p style={{ fontSize: '18px', margin: 0 }}>No invoices found</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {invoices.map((invoice) => {
                const statusStyle = getStatusColor(invoice.status);
                return (
                  <div
                    key={invoice.id}
                    onClick={() => navigate(`/invoices/${invoice.id}`)}
                    style={{
                      padding: '24px',
                      backgroundColor: '#f7fafc',
                      border: '2px solid #e2e8f0',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#1a1a1a';
                      e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.1)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'start',
                      flexWrap: 'wrap',
                      gap: '16px',
                    }}>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          marginBottom: '12px',
                        }}>
                          <h3 style={{
                            margin: 0,
                            fontSize: '20px',
                            fontWeight: '700',
                            color: '#1a202c',
                          }}>
                            {invoice.invoiceNumber}
                          </h3>
                          <span style={{
                            padding: '4px 12px',
                            backgroundColor: statusStyle.bg,
                            color: statusStyle.text,
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            border: `1px solid ${statusStyle.border}`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}>
                            <span>{getStatusIcon(invoice.status)}</span>
                            {invoice.status}
                          </span>
                        </div>
                        <div style={{
                          display: 'flex',
                          gap: '24px',
                          flexWrap: 'wrap',
                          marginBottom: '12px',
                        }}>
                          <div>
                            <span style={{ fontSize: '12px', color: '#718096', fontWeight: '600' }}>Invoice Date</span>
                            <p style={{
                              margin: '4px 0 0 0',
                              fontSize: '14px',
                              color: '#2d3748',
                              fontWeight: '500',
                            }}>
                              {new Date(invoice.invoiceDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </p>
                          </div>
                          <div>
                            <span style={{ fontSize: '12px', color: '#718096', fontWeight: '600' }}>Due Date</span>
                            <p style={{
                              margin: '4px 0 0 0',
                              fontSize: '14px',
                              color: '#2d3748',
                              fontWeight: '500',
                            }}>
                              {new Date(invoice.dueDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div style={{
                        textAlign: 'right',
                        minWidth: '120px',
                      }}>
                        <div style={{
                          fontSize: '24px',
                          fontWeight: '700',
                          color: '#1a202c',
                          marginBottom: '4px',
                        }}>
                          {invoice.currency} {invoice.totalAmount.toLocaleString()}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#718096',
                        }}>
                          Total Amount
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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

export default Dashboard;
