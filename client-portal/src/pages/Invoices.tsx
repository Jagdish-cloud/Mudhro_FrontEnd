import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

interface Invoice {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  currency: string;
  status: 'paid' | 'pending' | 'overdue';
}

const Invoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await api.get('/client-portal/invoices');
      if (response.data.success) {
        setInvoices(response.data.invoices || []);
      }
    } catch (err: any) {
      setError('Failed to load invoices');
      console.error('Error fetching invoices:', err);
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
        return '#28a745';
      case 'overdue':
        return '#dc3545';
      default:
        return '#ffc107';
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading invoices...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1>Your Invoices</h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Dashboard
            </button>
            <button
              onClick={handleLogout}
              style={{
                padding: '8px 16px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {error && (
          <div style={{ padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {invoices.length === 0 ? (
          <p>No invoices found.</p>
        ) : (
          <div style={{ display: 'grid', gap: '15px' }}>
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                onClick={() => navigate(`/invoices/${invoice.id}`)}
                style={{
                  padding: '20px',
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <h3 style={{ marginBottom: '10px' }}>{invoice.invoiceNumber}</h3>
                    <p style={{ color: '#666', marginBottom: '5px' }}>
                      Date: {new Date(invoice.invoiceDate).toLocaleDateString()}
                    </p>
                    <p style={{ color: '#666', marginBottom: '5px' }}>
                      Due: {new Date(invoice.dueDate).toLocaleDateString()}
                    </p>
                    <p style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '10px' }}>
                      {invoice.currency} {invoice.totalAmount.toLocaleString()}
                    </p>
                  </div>
                  <span
                    style={{
                      padding: '6px 12px',
                      borderRadius: '4px',
                      backgroundColor: getStatusColor(invoice.status),
                      color: 'white',
                      fontSize: '14px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {invoice.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Invoices;
