import React, { useState, useEffect, useRef } from 'react';
import { Camera, Users, Home, Settings, Download, Mail, QrCode, Printer, CheckCircle, XCircle, Clock, DollarSign, Bed, ListChecks, Pencil, Save, X } from 'lucide-react';

// Simulated Stripe integration (in production, use actual Stripe)
const processStripePayment = async (amount, cardDetails) => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 2000));
  return { success: true, transactionId: 'txn_' + Date.now() };
};

// Email function - calls backend API to send via Office 365
const sendEmail = async (to, subject, body) => {
  try {
    // Use environment variable for API URL, or default to localhost:3001 for development
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
    console.log('📧 Attempting to send email via:', API_URL);
    const response = await fetch(`${API_URL}/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        subject,
        body,
        // Optional: HTML body support
        htmlBody: body.replace(/\n/g, '<br>'), // Convert newlines to <br> for HTML emails
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      const errorMessage = errorData.error || errorData.details || `HTTP ${response.status}: Failed to send email`;
      console.error('❌ Email API error:', errorMessage);
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('✅ Email sent successfully:', to, 'Subject:', subject);
    return { success: true, ...result };
  } catch (error) {
    // Check if it's a network error (CORS, connection refused, etc.)
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      console.error('❌ Network error - Is the backend server running on port 3001?');
      console.error('   Make sure to run: node backend/server.js');
    }
    console.error('❌ Error sending email:', error);
    console.error('Error details:', error.message);
    // Don't fail silently - log the error for debugging
    return { success: false, error: error.message };
  }
};

// Main App Component
export default function CampManagementApp() {
  const [currentView, setCurrentView] = useState('landing');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [registrations, setRegistrations] = useState([]);
  const [lodges, setLodges] = useState([]);
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [selectedRegistrationType, setSelectedRegistrationType] = useState(null);
  const [selfCheckInEnabled, setSelfCheckInEnabled] = useState(false);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedRegistrations = localStorage.getItem('campRegistrations');
    const savedLodges = localStorage.getItem('campLodges');
    const savedSelfCheckIn = localStorage.getItem('selfCheckInEnabled');
    
    if (savedRegistrations) {
      setRegistrations(JSON.parse(savedRegistrations));
    }
    if (savedLodges) {
      setLodges(JSON.parse(savedLodges));
    } else {
      // Initialize with sample lodges
      const initialLodges = [
        { id: '1', name: 'Pine Lodge', totalRooms: 10, assignedRooms: [] },
        { id: '2', name: 'Oak Lodge', totalRooms: 8, assignedRooms: [] }
      ];
      setLodges(initialLodges);
      localStorage.setItem('campLodges', JSON.stringify(initialLodges));
    }
    if (savedSelfCheckIn !== null) {
      setSelfCheckInEnabled(JSON.parse(savedSelfCheckIn));
    }
  }, []);

  // Save registrations to localStorage whenever they change
  useEffect(() => {
    if (registrations.length > 0) {
      localStorage.setItem('campRegistrations', JSON.stringify(registrations));
    }
  }, [registrations]);

  // Save lodges to localStorage whenever they change
  useEffect(() => {
    if (lodges.length > 0) {
      localStorage.setItem('campLodges', JSON.stringify(lodges));
    }
  }, [lodges]);

  // Save self check-in setting to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('selfCheckInEnabled', JSON.stringify(selfCheckInEnabled));
  }, [selfCheckInEnabled]);

  const navigation = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, adminOnly: true },
    { id: 'register', label: 'Register', icon: Users },
    { id: 'checkin', label: 'Check-In', icon: QrCode, adminOnly: true },
    { id: 'registrations', label: 'Registrations', icon: ListChecks, adminOnly: true },
    { id: 'lodges', label: 'Lodges', icon: Bed, adminOnly: true },
    { id: 'badges', label: 'Badges', icon: Printer, adminOnly: true },
    { id: 'export', label: 'Export', icon: Download, adminOnly: true },
  ];

  const handleAdminLogin = (username, password) => {
    // Simple demo login - in production, use proper authentication
    if (username === 'admin' && password === 'admin123') {
      setIsAdmin(true);
      setIsLoggedIn(true);
      setCurrentView('dashboard');
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setIsAdmin(false);
    setIsLoggedIn(false);
    setCurrentView('landing');
  };

  const handleUpdateRegistrationStatus = (registrationId, newStatus) => {
    setRegistrations(registrations.map(r =>
      r.id === registrationId ? { ...r, status: newStatus } : r
    ));
  };

  const handleUpdateRegistration = (registrationId, updatedData) => {
    setRegistrations(registrations.map(r =>
      r.id === registrationId ? { ...r, ...updatedData, name: `${updatedData.firstName || r.firstName} ${updatedData.middleName ? (updatedData.middleName + ' ') : (r.middleName ? r.middleName + ' ' : '')}${updatedData.lastName || r.lastName}` } : r
    ));
  };

  // Landing page view
  if (currentView === 'landing') {
    return <LandingPage onNavigate={setCurrentView} selfCheckInEnabled={selfCheckInEnabled} />;
  }

  // Admin login view
  if (currentView === 'adminLogin' && !isLoggedIn) {
    return <AdminLogin onLogin={handleAdminLogin} onBack={() => setCurrentView('landing')} />;
  }

  // Registration type selection view
  if (currentView === 'selectRegistrationType') {
    return (
      <RegistrationTypeSelection
        onSelectType={(type) => {
          setSelectedRegistrationType(type);
          setCurrentView('register');
        }}
        onBack={() => setCurrentView('landing')}
      />
    );
  }

  // User registration lookup view
  if (currentView === 'checkRegistration') {
    return (
      <CheckRegistrationStatus 
        registrations={registrations}
        selfCheckInEnabled={selfCheckInEnabled}
        onCheckIn={(id) => {
          setRegistrations(registrations.map(r =>
            r.id === id ? { ...r, checkedIn: true, checkInTime: new Date().toISOString() } : r
          ));
        }}
        onBack={() => setCurrentView('landing')} 
      />
    );
  }

  // Self Check-In view
  if (currentView === 'selfCheckIn') {
    return (
      <SelfCheckIn
        registrations={registrations}
        selfCheckInEnabled={selfCheckInEnabled}
        onCheckIn={(id) => {
          setRegistrations(registrations.map(r =>
            r.id === id ? { ...r, checkedIn: true, checkInTime: new Date().toISOString() } : r
          ));
        }}
        onBack={() => setCurrentView('landing')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">ICPF Awake Camp 2025</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm bg-blue-700 px-3 py-1 rounded">
                {isAdmin ? 'Admin' : 'User'}
              </span>
              {isAdmin && (
                <button
                  onClick={handleLogout}
                  className="text-xs bg-red-500 hover:bg-red-400 px-3 py-1 rounded"
                >
                  Logout
                </button>
              )}
              <button
                onClick={() => setCurrentView('landing')}
                className="text-xs bg-blue-500 hover:bg-blue-400 px-3 py-1 rounded"
              >
                Home
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar Navigation */}
          <nav className="w-64 bg-white rounded-lg shadow p-4">
            <ul className="space-y-2">
              {navigation.map(item => {
                if (item.adminOnly && !isAdmin) return null;
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => setCurrentView(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                        currentView === item.id
                          ? 'bg-blue-100 text-blue-600'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Main Content */}
          <main className="flex-1">
            {currentView === 'dashboard' && (
              <Dashboard 
                registrations={registrations} 
                lodges={lodges} 
                isAdmin={isAdmin}
                selfCheckInEnabled={selfCheckInEnabled}
                onToggleSelfCheckIn={() => setSelfCheckInEnabled(!selfCheckInEnabled)}
              />
            )}
            {currentView === 'register' && (
              <RegistrationForm
                registrationType={selectedRegistrationType}
                onRegister={(registration) => {
                  setRegistrations([...registrations, registration]);
                }}
                onBack={() => {
                  setSelectedRegistrationType(null);
                  setCurrentView('selectRegistrationType');
                }}
              />
            )}
            {currentView === 'checkin' && (
              <CheckInView
                registrations={registrations}
                onCheckIn={(id) => {
                  setRegistrations(registrations.map(r =>
                    r.id === id ? { ...r, checkedIn: true, checkInTime: new Date().toISOString() } : r
                  ));
                }}
              />
            )}
            {currentView === 'registrations' && isAdmin && (
              <AdminRegistrations
                registrations={registrations}
                onUpdateStatus={handleUpdateRegistrationStatus}
                onUpdateRegistration={handleUpdateRegistration}
              />
            )}
            {currentView === 'lodges' && isAdmin && (
              <LodgeManagement
                lodges={lodges}
                setLodges={setLodges}
                registrations={registrations.filter(r => r.status === 'confirmed')}
                onAssignRoom={(registrationId, lodgeId, roomNumber) => {
                  setRegistrations(registrations.map(r =>
                    r.id === registrationId ? { ...r, lodgeId, roomNumber } : r
                  ));
                  setLodges(lodges.map(l => {
                    if (l.id === lodgeId) {
                      return {
                        ...l,
                        assignedRooms: [...l.assignedRooms, { registrationId, roomNumber }]
                      };
                    }
                    return l;
                  }));
                }}
              />
            )}
            {currentView === 'badges' && isAdmin && (
              <BadgePrinting
                registrations={registrations}
                lodges={lodges}
                onPrint={(id) => setSelectedRegistration(registrations.find(r => r.id === id))}
              />
            )}
            {currentView === 'export' && isAdmin && (
              <ExportView registrations={registrations} lodges={lodges} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

// Landing Page Component
function LandingPage({ onNavigate, selfCheckInEnabled }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">ICPF Awake Camp 2025</h1>
          <p className="text-xl text-blue-100">Welcome to the camp registration portal</p>
        </div>

        <div className={`grid gap-6 ${selfCheckInEnabled ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2'}`}>
          {/* Camp Registration Form Card */}
          <button
            onClick={() => onNavigate('selectRegistrationType')}
            className="bg-white rounded-xl shadow-2xl p-8 hover:shadow-3xl transition-all transform hover:-translate-y-2 text-left group"
          >
            <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-6 group-hover:bg-blue-200 transition">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">Camp Registration Form</h2>
            <p className="text-gray-600 mb-4">
              Register for the camp experience. Fill out the registration form with your details.
            </p>
            <div className="flex items-center text-blue-600 font-semibold">
              <span>Start Registration</span>
              <span className="ml-2 group-hover:ml-4 transition-all">→</span>
            </div>
          </button>

          {/* Check Registration Details Card */}
          <button
            onClick={() => onNavigate('checkRegistration')}
            className="bg-white rounded-xl shadow-2xl p-8 hover:shadow-3xl transition-all transform hover:-translate-y-2 text-left group"
          >
            <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6 group-hover:bg-green-200 transition">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">Check Registration Details</h2>
            <p className="text-gray-600 mb-4">
              Already registered? View your registration status, payment details, and lodge assignment.
            </p>
            <div className="flex items-center text-green-600 font-semibold">
              <span>Check Status</span>
              <span className="ml-2 group-hover:ml-4 transition-all">→</span>
            </div>
          </button>

          {/* Self Check-In Card - Only shown when admin enables it */}
          {selfCheckInEnabled && (
            <button
              onClick={() => onNavigate('selfCheckIn')}
              className="bg-white rounded-xl shadow-2xl p-8 hover:shadow-3xl transition-all transform hover:-translate-y-2 text-left group"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-6 group-hover:bg-purple-200 transition">
                <QrCode className="w-8 h-8 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">Self Check-In</h2>
              <p className="text-gray-600 mb-4">
                Check in for the camp. Search for your registration and complete your check-in.
              </p>
              <div className="flex items-center text-purple-600 font-semibold">
                <span>Check In Now</span>
                <span className="ml-2 group-hover:ml-4 transition-all">→</span>
              </div>
            </button>
          )}
        </div>

        {/* Admin Login Link */}
        <div className="text-center mt-12">
          <button
            onClick={() => onNavigate('adminLogin')}
            className="text-white hover:text-blue-100 text-sm underline"
          >
            Admin Login
          </button>
        </div>
      </div>
    </div>
  );
}

// Admin Login Component
function AdminLogin({ onLogin, onBack }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const success = onLogin(username, password);
    if (!success) {
      setError('Invalid username or password');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4">
              <Settings className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800">Admin Login</h2>
            <p className="text-gray-600 mt-2">Access the admin dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter password"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition"
            >
              Login
            </button>

            <button
              type="button"
              onClick={onBack}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg transition"
            >
              Back to Home
            </button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>Demo credentials:</strong><br />
              Username: admin<br />
              Password: admin123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Registration Type Selection Component
function RegistrationTypeSelection({ onSelectType, onBack }) {
  const registrationTypes = [
    { id: 'student', label: 'Student', price: 195, description: 'Individual student registration' },
    { id: 'adult', label: 'Adult', price: 300, description: 'Individual adult registration' },
    { id: 'family2', label: 'Family of 2', price: 550, description: 'Two family members (at least one adult required)' },
    { id: 'family3', label: 'Family of 3', price: 700, description: 'Three family members (at least one adult required)' },
    { id: 'family4', label: 'Family of 4', price: 850, description: 'Four family members (at least one adult required)' },
    { id: 'family5', label: 'Family of 5', price: 1100, description: 'Five family members (at least one adult required)' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center p-4">
      <div className="max-w-5xl w-full">
        <div className="bg-white rounded-xl shadow-2xl p-8">
          <button
            onClick={onBack}
            className="mb-6 text-gray-600 hover:text-gray-800 flex items-center gap-2"
          >
            ← Back to Home
          </button>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Registration Type Selection</h2>
            <p className="text-gray-600">Please select your registration type to continue</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {registrationTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => onSelectType(type.id)}
                className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-lg transition-all text-left group"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-bold text-gray-800 group-hover:text-blue-600">
                    {type.label}
                  </h3>
                  <span className="text-2xl font-bold text-blue-600">${type.price}</span>
                </div>
                <p className="text-sm text-gray-600">{type.description}</p>
                <div className="mt-4 flex items-center text-blue-600 font-semibold text-sm">
                  <span>Select</span>
                  <span className="ml-2 group-hover:ml-4 transition-all">→</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Check Registration Status Component
function CheckRegistrationStatus({ registrations, onBack, selfCheckInEnabled, onCheckIn }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBy, setSearchBy] = useState('email');
  const [foundRegistration, setFoundRegistration] = useState(null);
  const [searched, setSearched] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearched(true);
    
    const registration = registrations.find(r => {
      if (searchBy === 'email') {
        return r.email.toLowerCase() === searchTerm.toLowerCase();
      } else {
        return r.qrCode === searchTerm;
      }
    });

    setFoundRegistration(registration || null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-xl shadow-2xl p-8">
          <button
            onClick={onBack}
            className="mb-6 text-gray-600 hover:text-gray-800 flex items-center gap-2"
          >
            ← Back to Home
          </button>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Check Registration Status</h2>
            <p className="text-gray-600">Enter your email or registration code to view details</p>
          </div>

          <form onSubmit={handleSearch} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search by
              </label>
              <div className="flex gap-4 mb-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="email"
                    checked={searchBy === 'email'}
                    onChange={(e) => setSearchBy(e.target.value)}
                    className="mr-2"
                  />
                  Email Address
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="qrCode"
                    checked={searchBy === 'qrCode'}
                    onChange={(e) => setSearchBy(e.target.value)}
                    className="mr-2"
                  />
                  Registration Code
                </label>
              </div>
            </div>

            <div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder={searchBy === 'email' ? 'Enter your email address' : 'Enter your registration code'}
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition"
            >
              Search Registration
            </button>
          </form>

          {searched && (
            <div className="mt-8">
              {foundRegistration ? (
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                    <h3 className="text-xl font-bold text-gray-800">Registration Found!</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Full Name</p>
                        <p className="font-semibold text-gray-800">{foundRegistration.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Gender</p>
                        <p className="font-semibold text-gray-800 capitalize">{foundRegistration.gender || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-semibold text-gray-800">{foundRegistration.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Mobile Number</p>
                        <p className="font-semibold text-gray-800">{foundRegistration.mobileNumber}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Address</p>
                        <p className="font-semibold text-gray-800">
                          {foundRegistration.addressLine1 || 'N/A'}
                          {foundRegistration.city && `, ${foundRegistration.city}`}
                          {foundRegistration.state && `, ${foundRegistration.state}`}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">T-Shirt Size</p>
                        <p className="font-semibold text-gray-800">{foundRegistration.tshirtSize || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Registration Type</p>
                        <p className="font-semibold text-gray-800 capitalize">{foundRegistration.type}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Amount</p>
                        <p className="font-semibold text-gray-800">${foundRegistration.amount}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Registration Status</p>
                        <StatusBadge status={foundRegistration.status} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Payment Status</p>
                        <PaymentBadge status={foundRegistration.paymentStatus} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Check-In Status</p>
                        <p className="font-semibold text-gray-800">
                          {foundRegistration.checkedIn ? '✓ Checked In' : 'Not Checked In'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Registration Code</p>
                        <p className="font-mono text-sm font-semibold text-gray-800">{foundRegistration.qrCode}</p>
                      </div>
                    </div>

                    {foundRegistration.allergies && foundRegistration.allergies !== 'none' && (
                      <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-sm font-semibold text-red-800 mb-1">Allergies</p>
                        <p className="text-gray-700 capitalize">{foundRegistration.allergies}</p>
                        {foundRegistration.allergyDescription && (
                          <p className="text-gray-700 mt-1 text-sm">{foundRegistration.allergyDescription}</p>
                        )}
                      </div>
                    )}

                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm font-semibold text-blue-800 mb-2">Emergency Contact</p>
                      <p className="text-gray-700">
                        {foundRegistration.emergencyContactName} ({foundRegistration.emergencyContactRelationship})
                      </p>
                      <p className="text-gray-700">{foundRegistration.emergencyContactPhone}</p>
                    </div>

                    {foundRegistration.lodgeId && (
                      <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                        <p className="text-sm font-semibold text-purple-800 mb-1">Lodge Assignment</p>
                        <p className="text-gray-700">Room {foundRegistration.roomNumber}</p>
                      </div>
                    )}

                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600">
                        Registered on: {new Date(foundRegistration.registeredAt).toLocaleString()}
                      </p>
                    </div>

                    {/* Check-In Button - Only shown when self check-in is enabled */}
                    {selfCheckInEnabled && foundRegistration.status === 'confirmed' && !foundRegistration.checkedIn && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <button
                          onClick={() => {
                            if (onCheckIn) {
                              onCheckIn(foundRegistration.id);
                              setCheckInSuccess(true);
                              // Update the found registration to reflect check-in
                              setFoundRegistration({ ...foundRegistration, checkedIn: true, checkInTime: new Date().toISOString() });
                              setTimeout(() => setCheckInSuccess(false), 3000);
                            }
                          }}
                          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-5 h-5" />
                          Check In
                        </button>
                        {checkInSuccess && (
                          <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg text-center">
                            <p className="text-green-800 font-semibold">Successfully checked in!</p>
                            <p className="text-sm text-green-700 mt-1">Check-in time: {new Date().toLocaleString()}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {selfCheckInEnabled && foundRegistration.status === 'confirmed' && foundRegistration.checkedIn && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <div className="bg-green-100 border border-green-300 rounded-lg p-4 text-center">
                          <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                          <p className="text-green-800 font-semibold">Already Checked In</p>
                          {foundRegistration.checkInTime && (
                            <p className="text-sm text-green-700 mt-1">
                              Check-in time: {new Date(foundRegistration.checkInTime).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {selfCheckInEnabled && foundRegistration.status !== 'confirmed' && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 text-center">
                          <Clock className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                          <p className="text-yellow-800 font-semibold">Check-in Not Available</p>
                          <p className="text-sm text-yellow-700 mt-1">
                            Your registration must be confirmed before you can check in.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 text-center">
                  <XCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-gray-800 mb-2">No Registration Found</h3>
                  <p className="text-gray-600">
                    We couldn't find a registration with that {searchBy === 'email' ? 'email address' : 'registration code'}.
                    Please check and try again.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Self Check-In Component
function SelfCheckIn({ registrations, selfCheckInEnabled, onCheckIn, onBack }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBy, setSearchBy] = useState('email');
  const [foundRegistration, setFoundRegistration] = useState(null);
  const [searched, setSearched] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearched(true);
    
    const registration = registrations.find(r => {
      if (searchBy === 'email') {
        return r.email.toLowerCase() === searchTerm.toLowerCase();
      } else {
        return r.qrCode === searchTerm;
      }
    });

    setFoundRegistration(registration || null);
  };

  const handleCheckIn = () => {
    if (foundRegistration && onCheckIn) {
      onCheckIn(foundRegistration.id);
      setCheckInSuccess(true);
      setFoundRegistration({ ...foundRegistration, checkedIn: true, checkInTime: new Date().toISOString() });
      setTimeout(() => setCheckInSuccess(false), 5000);
    }
  };

  if (!selfCheckInEnabled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-xl shadow-2xl p-8 text-center">
            <button
              onClick={onBack}
              className="mb-6 text-gray-600 hover:text-gray-800 flex items-center gap-2"
            >
              ← Back to Home
            </button>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Self Check-In Not Available</h2>
            <p className="text-gray-600">Self check-in is currently disabled. Please contact an administrator.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-xl shadow-2xl p-8">
          <button
            onClick={onBack}
            className="mb-6 text-gray-600 hover:text-gray-800 flex items-center gap-2"
          >
            ← Back to Home
          </button>

          <div className="text-center mb-8">
            <div className="flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4 mx-auto">
              <QrCode className="w-8 h-8 text-purple-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Self Check-In</h2>
            <p className="text-gray-600">Search for your registration to check in</p>
          </div>

          <form onSubmit={handleSearch} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search by
              </label>
              <div className="flex gap-4 mb-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="email"
                    checked={searchBy === 'email'}
                    onChange={(e) => setSearchBy(e.target.value)}
                    className="mr-2"
                  />
                  Email Address
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="code"
                    checked={searchBy === 'code'}
                    onChange={(e) => setSearchBy(e.target.value)}
                    className="mr-2"
                  />
                  Registration Code
                </label>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder={searchBy === 'email' ? 'Enter your email address' : 'Enter your registration code'}
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition"
            >
              Search Registration
            </button>
          </form>

          {searched && (
            <div className="mt-8">
              {foundRegistration ? (
                <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle className="w-8 h-8 text-purple-600" />
                    <h3 className="text-xl font-bold text-gray-800">Registration Found!</h3>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Full Name</p>
                        <p className="font-semibold text-gray-800">{foundRegistration.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-semibold text-gray-800">{foundRegistration.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Registration Status</p>
                        <StatusBadge status={foundRegistration.status} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Check-In Status</p>
                        <p className="font-semibold text-gray-800">
                          {foundRegistration.checkedIn ? '✓ Checked In' : 'Not Checked In'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Check-In Button */}
                  {foundRegistration.status === 'confirmed' && !foundRegistration.checkedIn && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <button
                        onClick={handleCheckIn}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-5 h-5" />
                        Check In Now
                      </button>
                      {checkInSuccess && (
                        <div className="mt-4 p-4 bg-green-100 border border-green-300 rounded-lg text-center">
                          <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                          <p className="text-green-800 font-semibold text-lg">Successfully Checked In!</p>
                          <p className="text-sm text-green-700 mt-1">Check-in time: {new Date().toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {foundRegistration.status === 'confirmed' && foundRegistration.checkedIn && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="bg-green-100 border border-green-300 rounded-lg p-4 text-center">
                        <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        <p className="text-green-800 font-semibold">Already Checked In</p>
                        {foundRegistration.checkInTime && (
                          <p className="text-sm text-green-700 mt-1">
                            Check-in time: {new Date(foundRegistration.checkInTime).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {foundRegistration.status !== 'confirmed' && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 text-center">
                        <Clock className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                        <p className="text-yellow-800 font-semibold">Registration Not Confirmed</p>
                        <p className="text-sm text-yellow-700 mt-1">
                          Your registration must be confirmed before you can check in. Please contact an administrator.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 text-center">
                  <XCircle className="w-8 h-8 text-red-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Registration Not Found</h3>
                  <p className="text-gray-600">
                    No registration found with the provided {searchBy === 'email' ? 'email address' : 'registration code'}.
                    Please check your information and try again.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Dashboard Component
function Dashboard({ registrations, lodges, isAdmin, selfCheckInEnabled, onToggleSelfCheckIn }) {
  const stats = {
    total: registrations.length,
    pending: registrations.filter(r => r.status === 'pending').length,
    confirmed: registrations.filter(r => r.status === 'confirmed').length,
    checkedIn: registrations.filter(r => r.checkedIn).length,
    totalRevenue: registrations
      .filter(r => r.paymentStatus === 'paid')
      .reduce((sum, r) => sum + r.amount, 0)
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
        {isAdmin && (
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <span className="text-sm font-medium text-gray-700">Enable Self Check-In</span>
              <div className="relative" onClick={(e) => { e.preventDefault(); onToggleSelfCheckIn(); }}>
                <input
                  type="checkbox"
                  checked={selfCheckInEnabled}
                  onChange={(e) => {
                    e.preventDefault();
                    onToggleSelfCheckIn();
                  }}
                  className="sr-only"
                />
                <div
                  className={`w-14 h-7 rounded-full transition-colors cursor-pointer ${
                    selfCheckInEnabled ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                      selfCheckInEnabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                    style={{ marginTop: '2px' }}
                  />
                </div>
              </div>
            </label>
            <span className={`text-sm px-3 py-1 rounded-full ${
              selfCheckInEnabled 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              {selfCheckInEnabled ? 'Self Check-In: ON' : 'Self Check-In: OFF'}
            </span>
          </div>
        )}
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Registrations"
          value={stats.total}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Pending Approval"
          value={stats.pending}
          icon={Clock}
          color="yellow"
        />
        <StatCard
          title="Confirmed"
          value={stats.confirmed}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Checked In"
          value={stats.checkedIn}
          icon={QrCode}
          color="purple"
        />
      </div>

      {isAdmin && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Revenue Summary</h3>
          <div className="text-3xl font-bold text-green-600">
            ${stats.totalRevenue.toFixed(2)}
          </div>
        </div>
      )}

      {/* Recent Registrations */}
      {isAdmin && registrations.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">Recent Registrations</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {registrations.slice(0, 5).map(reg => (
                  <tr key={reg.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{reg.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="capitalize">{reg.type}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={reg.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <PaymentBadge status={reg.paymentStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Registration Form Component
function RegistrationForm({ registrationType, onRegister, onBack }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    gender: '',
    camperCategory: '',
    email: '',
    confirmEmail: '',
    firstTimeAttending: '',
    addressLine1: '',
    addressLine2: '',
    country: 'United States',
    state: '',
    city: '',
    zip: '',
    countryCode: 'United States +1',
    mobileNumber: '',
    homePhone: '',
    churchName: '',
    pastorName: '',
    allergies: '',
    allergyDescription: '',
    emergencyContactRelationship: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    parentGuardianName: '',
    parentGuardianEmail: '',
    parentGuardianPhone: '',
    tshirtSize: '',
    type: '',
  });
  const [familyMembers, setFamilyMembers] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvv: ''
  });
  const [processing, setProcessing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);


  const campFees = {
    student: 195,
    adult: 300,
    family2: 550,
    family3: 700,
    family4: 850,
    family5: 1100
  };

  const getTotalAmount = () => {
    if (registrationType && campFees[registrationType]) {
      return campFees[registrationType];
    }
    return registrationType === 'student' ? 195 : 300;
  };

  const isFamilyRegistration = registrationType && registrationType.startsWith('family');
  const isStudentRegistration = registrationType === 'student';
  const isAdultRegistration = registrationType === 'adult';

  const usStates = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 
    'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 
    'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 
    'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 
    'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 
    'Wisconsin', 'Wyoming'
  ];

  // Helper function to calculate age from date of birth
  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return '';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Helper functions for family registrations
  const createEmptyMember = () => ({
    firstName: '',
    lastName: '',
    middleName: '',
    gender: '',
    camperCategory: '',
    email: '',
    confirmEmail: '',
    mobileNumber: '',
    dateOfBirth: '',
    age: '',
    firstTimeAttending: '',
    campVolunteer: '',
    tshirtSize: '',
    allergies: '',
    allergyDescription: '',
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactPhone: '',
    parentGuardianName: '',
    parentGuardianEmail: '',
    parentGuardianPhone: ''
  });

  // Initialize family members based on registration type
  useEffect(() => {
    if (registrationType && registrationType.startsWith('family')) {
      const familySize = parseInt(registrationType.replace('family', ''));
      const members = [];
      for (let i = 0; i < familySize; i++) {
        members.push(createEmptyMember());
      }
      setFamilyMembers(members);
    }
  }, [registrationType]);

  const updateFamilyMember = (index, field, value) => {
    const updated = [...familyMembers];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-calculate age when date of birth changes
    if (field === 'dateOfBirth') {
      const age = calculateAge(value);
      updated[index].age = age;
    }
    
    setFamilyMembers(updated);
  };

  const calculateFamilyTotal = () => {
    let total = 0;
    familyMembers.forEach(member => {
      if (member.camperCategory) {
        const isAdult = member.camperCategory === 'Adults' || member.camperCategory.includes('Adult');
        total += isAdult ? 300 : 195;
      }
    });
    return total;
  };

  const validateFamily = () => {
    if (isFamilyRegistration) {
      // Check minimum age and first member requirements for all members
      for (let i = 0; i < familyMembers.length; i++) {
        const member = familyMembers[i];
        if (!member.dateOfBirth) {
          alert(`Please enter date of birth for family member ${i + 1}!`);
          return false;
        }
        const age = calculateAge(member.dateOfBirth);
        
        // First member must be adult (25+ years)
        if (i === 0) {
          if (!member.camperCategory || member.camperCategory !== 'Adults') {
            alert('The first family member must be an adult (25+ years old)!');
            return false;
          }
          if (age < 25) {
            alert(`The first family member must be at least 25 years old! Current age: ${age}`);
            return false;
          }
        }
        
        // All members must be at least 11 years old
        if (age < 11) {
          alert(`Family member ${i + 1} must be at least 11 years old! Current age: ${age}`);
          return false;
        }
      }

      // Validate email confirmation for all family members
      for (let i = 0; i < familyMembers.length; i++) {
        const member = familyMembers[i];
        if (member.email && member.confirmEmail && member.email !== member.confirmEmail) {
          alert(`Email and Confirm Email must match for family member ${i + 1}!`);
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate consent agreement
    if (!consentAccepted) {
      alert('Please read and accept the consent agreement to continue.');
      return;
    }
    
    // Validate email confirmation
    if (formData.email !== formData.confirmEmail) {
      alert('Email and Confirm Email must match!');
      return;
    }
    
    // Validate family has adult
    if (!validateFamily()) {
      return;
    }
    
    setProcessing(true);

    const familyCode = isFamilyRegistration ? 'FAM_' + Date.now() : null;
    const totalAmount = getTotalAmount();

    if (isFamilyRegistration) {
      // Create multiple registrations for family
      const registrations = [];
      
      for (let i = 0; i < familyMembers.length; i++) {
        const member = familyMembers[i];
        const isAdult = member.camperCategory && (member.camperCategory === 'Adults' || member.camperCategory.includes('Adult'));
        
        const registration = {
          id: 'reg_' + Date.now() + '_' + i + '_' + Math.random().toString(36).substr(2, 9),
          name: `${member.firstName} ${member.middleName ? member.middleName + ' ' : ''}${member.lastName}`,
          firstName: member.firstName,
          lastName: member.lastName,
          middleName: member.middleName,
          gender: member.gender,
          camperCategory: member.camperCategory,
          email: member.email || formData.email,
          confirmEmail: member.confirmEmail || member.email || formData.email,
          mobileNumber: member.mobileNumber,
          dateOfBirth: member.dateOfBirth,
          age: member.age,
          firstTimeAttending: member.firstTimeAttending,
          campVolunteer: member.campVolunteer,
          tshirtSize: member.tshirtSize,
          allergies: member.allergies,
          allergyDescription: member.allergyDescription,
          emergencyContactName: member.emergencyContactName,
          emergencyContactRelationship: member.emergencyContactRelationship,
          emergencyContactPhone: member.emergencyContactPhone,
          parentGuardianName: member.parentGuardianName,
          parentGuardianEmail: member.parentGuardianEmail,
          parentGuardianPhone: member.parentGuardianPhone,
          churchName: formData.churchName,
          pastorName: formData.pastorName,
          type: isAdult ? 'adult' : 'student',
          amount: isAdult ? 300 : 195,
          familyCode: familyCode,
          familyType: registrationType,
          familyPosition: i + 1,
          familyTotal: totalAmount,
          paymentMethod,
          paymentStatus: i === 0 ? (paymentMethod === 'card' ? 'processing' : 'pending') : 'linked',
          status: 'pending',
          registeredAt: new Date().toISOString(),
          checkedIn: false,
          qrCode: 'QR_' + familyCode + '_' + i,
          addressLine1: formData.addressLine1,
          addressLine2: formData.addressLine2,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
          country: formData.country,
          countryCode: formData.countryCode,
          homePhone: formData.homePhone
        };
        
        registrations.push(registration);
      }

      // Process payment only once for the family
      if (paymentMethod === 'card') {
        const paymentResult = await processStripePayment(totalAmount, cardDetails);
        if (paymentResult.success) {
          registrations[0].paymentStatus = 'paid';
          registrations[0].transactionId = paymentResult.transactionId;
          registrations[0].paymentDate = new Date().toISOString();
        }
      }

      // Send registration received email
      const familyEmailBody = `Dear ${formData.firstName} ${formData.lastName},

Thank you for registering your family for ICPF Awake Camp 2025!

Registration Details:
- Family Code: ${familyCode}
- Number of Family Members: ${registrations.length}
- Total Amount: $${totalAmount}
- Payment Method: ${paymentMethod === 'card' ? 'Credit/Debit Card' : paymentMethod === 'check' ? 'Check' : 'Cash'}
${paymentMethod === 'card' && registrations[0].paymentStatus === 'paid' ? `- Payment Status: Paid\n- Transaction ID: ${registrations[0].transactionId}` : '- Payment Status: Pending'}

Your registration is now pending admin approval. You will receive a confirmation email once your registration has been reviewed and approved.

Best regards,
ICPF Awake Camp Team`;

      await sendEmail(
        formData.email,
        'ICPF Awake Camp Family Registration Received',
        familyEmailBody
      );

      // Register all family members
      registrations.forEach(reg => onRegister(reg));
      
    } else {
      // Single registration (student or adult)
      const registration = {
        id: 'reg_' + Date.now(),
        name: `${formData.firstName} ${formData.middleName ? formData.middleName + ' ' : ''}${formData.lastName}`,
        ...formData,
        type: registrationType,
        amount: getTotalAmount(),
        familyCode: null,
        paymentMethod,
        paymentStatus: paymentMethod === 'card' ? 'processing' : 'pending',
        status: 'pending',
        registeredAt: new Date().toISOString(),
        checkedIn: false,
        qrCode: 'QR_' + Date.now()
      };

      if (paymentMethod === 'card') {
        const paymentResult = await processStripePayment(registration.amount, cardDetails);
        if (paymentResult.success) {
          registration.paymentStatus = 'paid';
          registration.transactionId = paymentResult.transactionId;
          registration.paymentDate = new Date().toISOString();
        }
      }

      const registrationEmailBody = `Dear ${formData.firstName} ${formData.lastName},

Thank you for registering for ICPF Awake Camp 2025!

Registration Details:
- Registration Code: ${registration.qrCode}
- Registration Type: ${registrationType === 'student' ? 'Student' : 'Adult'}
- Amount: $${registration.amount}
- Payment Method: ${paymentMethod === 'card' ? 'Credit/Debit Card' : paymentMethod === 'check' ? 'Check' : 'Cash'}
${paymentMethod === 'card' && registration.paymentStatus === 'paid' ? `- Payment Status: Paid\n- Transaction ID: ${registration.transactionId}` : '- Payment Status: Pending'}

Your registration is now pending admin approval. You will receive a confirmation email once your registration has been reviewed and approved.

Best regards,
ICPF Awake Camp Team`;

      await sendEmail(
        formData.email,
        'ICPF Awake Camp Registration Received',
        registrationEmailBody
      );

      onRegister(registration);
    }

    setProcessing(false);
    setSubmitted(true);

    // Reset form
    setTimeout(() => {
      setSubmitted(false);
      setConsentAccepted(false);
      setFormData({
        firstName: '',
        lastName: '',
        middleName: '',
        gender: '',
        camperCategory: '',
        email: '',
        confirmEmail: '',
        firstTimeAttending: '',
        addressLine1: '',
        addressLine2: '',
        country: 'United States',
        state: '',
        city: '',
        zip: '',
        countryCode: 'United States +1',
        mobileNumber: '',
        homePhone: '',
        churchName: '',
        pastorName: '',
        allergies: '',
        allergyDescription: '',
        emergencyContactRelationship: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        parentGuardianName: '',
        parentGuardianEmail: '',
        parentGuardianPhone: '',
        tshirtSize: '',
        type: '',
      });
      setFamilyMembers([]);
      setCardDetails({ number: '', expiry: '', cvv: '' });
    }, 3000);
  };

  if (submitted) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Registration Received!</h2>
        <p className="text-gray-600 mb-4">
          Thank you for registering. You will receive a confirmation email once an admin approves your registration.
        </p>
        <p className="text-sm text-gray-500">
          Check your email for registration details and QR code.
        </p>
      </div>
    );
  }

  if (!registrationType) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-600 mb-4">Please select a registration type first.</p>
        {onBack && (
          <button
            onClick={onBack}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Go Back
          </button>
        )}
      </div>
    );
  }

  const registrationTypeLabels = {
    student: 'Student Registration',
    adult: 'Adult Registration',
    family2: 'Family of 2 Registration',
    family3: 'Family of 3 Registration',
    family4: 'Family of 4 Registration',
    family5: 'Family of 5 Registration'
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          {registrationTypeLabels[registrationType] || 'Register for ICPF Awake Camp 2025'}
        </h2>
        {onBack && (
          <button
            onClick={onBack}
            className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
          >
            ← Back
          </button>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Participant Information - Only for single registrations */}
        {!isFamilyRegistration && (
        <div>
          <h3 className="text-lg font-semibold bg-gray-600 text-white px-4 py-2 rounded mb-4">Participant Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="text-red-500">*</span> First Name
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="text-red-500">*</span> Last Name
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Middle Name
              </label>
              <input
                type="text"
                value={formData.middleName}
                onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="text-red-500">*</span> Gender
              </label>
              <select
                required
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="text-red-500">*</span> Camper Category
              </label>
              <select
                required
                value={formData.camperCategory}
                onChange={(e) => setFormData({ ...formData, camperCategory: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select</option>
                <option value="Middle School">Middle School</option>
                <option value="High School">High School</option>
                <option value="College">College</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="text-red-500">*</span> Email
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="text-red-500">*</span> Confirm Email
              </label>
              <input
                type="email"
                required
                value={formData.confirmEmail}
                onChange={(e) => setFormData({ ...formData, confirmEmail: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="text-red-500">*</span> Church Name
              </label>
              <input
                type="text"
                required
                value={formData.churchName}
                onChange={(e) => setFormData({ ...formData, churchName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your church name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="text-red-500">*</span> Pastor Name
              </label>
              <input
                type="text"
                required
                value={formData.pastorName}
                onChange={(e) => setFormData({ ...formData, pastorName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your pastor's name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Are you first time attending
              </label>
              <select
                value={formData.firstTimeAttending}
                onChange={(e) => setFormData({ ...formData, firstTimeAttending: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address Line 1
              </label>
              <input
                type="text"
                value={formData.addressLine1}
                onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address Line 2
              </label>
              <input
                type="text"
                value={formData.addressLine2}
                onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>
              <select
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="United States">United States</option>
                <option value="Canada">Canada</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State
              </label>
              <select
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select</option>
                {usStates.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Zip
              </label>
              <input
                type="text"
                value={formData.zip}
                onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="text-red-500">*</span> Country Code
              </label>
              <select
                required
                value={formData.countryCode}
                onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="United States +1">United States +1</option>
                <option value="Canada +1">Canada +1</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="text-red-500">*</span> Mobile number
              </label>
              <input
                type="tel"
                required
                value={formData.mobileNumber}
                onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Home Phone
              </label>
              <input
                type="tel"
                value={formData.homePhone}
                onChange={(e) => setFormData({ ...formData, homePhone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="text-red-500">*</span> Allergies
              </label>
              <select
                required
                value={formData.allergies}
                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select</option>
                <option value="none">None</option>
                <option value="food">Food Allergies</option>
                <option value="medication">Medication Allergies</option>
                <option value="environmental">Environmental Allergies</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allergy Description
              </label>
              <input
                type="text"
                value={formData.allergyDescription}
                onChange={(e) => setFormData({ ...formData, allergyDescription: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Please describe any allergies in detail"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="text-red-500">*</span> T-Shirt Size
              </label>
              <select
                required
                value={formData.tshirtSize}
                onChange={(e) => setFormData({ ...formData, tshirtSize: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select</option>
                <option value="Youth small">Youth small</option>
                <option value="Youth Medium">Youth Medium</option>
                <option value="Youth Large">Youth Large</option>
                <option value="Adult small">Adult small</option>
                <option value="Adult Medium">Adult Medium</option>
                <option value="Adult Large">Adult Large</option>
                <option value="Adult XL">Adult XL</option>
                <option value="Adult XXL">Adult XXL</option>
              </select>
            </div>
          </div>
        </div>
        )}

        {/* Emergency Contact - Only for Adults */}
        {isAdultRegistration && !isFamilyRegistration && (
          <div>
            <h3 className="text-lg font-semibold bg-gray-600 text-white px-4 py-2 rounded mb-4">Emergency Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="text-red-500">*</span> Relationship
                </label>
                <input
                  type="text"
                  required
                  value={formData.emergencyContactRelationship}
                  onChange={(e) => setFormData({ ...formData, emergencyContactRelationship: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Parent, Spouse, Sibling"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="text-red-500">*</span> Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.emergencyContactName}
                  onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="text-red-500">*</span> Phone
                </label>
                <input
                  type="tel"
                  required
                  value={formData.emergencyContactPhone}
                  onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}

        {/* Parent/Guardian Information - Only for Students */}
        {isStudentRegistration && !isFamilyRegistration && (
          <div className="border-2 border-yellow-400 rounded-lg">
            <h3 className="text-lg font-semibold bg-yellow-100 text-yellow-900 px-4 py-2 rounded-t mb-4">
              Parent/Guardian Information (Required for Students)
            </h3>
            <div className="px-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="text-red-500">*</span> Parent/Guardian Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.parentGuardianName}
                    onChange={(e) => setFormData({ ...formData, parentGuardianName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="text-red-500">*</span> Parent/Guardian Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.parentGuardianEmail}
                    onChange={(e) => setFormData({ ...formData, parentGuardianEmail: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="text-red-500">*</span> Parent/Guardian Phone
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.parentGuardianPhone}
                    onChange={(e) => setFormData({ ...formData, parentGuardianPhone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Family Members Registration */}
        {isFamilyRegistration && (
          <div>
            {/* Shared Information for Family */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold bg-gray-600 text-white px-4 py-2 rounded mb-4">
                Shared Family Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="text-red-500">*</span> Church Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.churchName}
                    onChange={(e) => setFormData({ ...formData, churchName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your church name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="text-red-500">*</span> Pastor Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.pastorName}
                    onChange={(e) => setFormData({ ...formData, pastorName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your pastor's name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="text-red-500">*</span> Address Line 1
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.addressLine1}
                    onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    value={formData.addressLine2}
                    onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="text-red-500">*</span> City
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="text-red-500">*</span> State
                  </label>
                  <select
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select</option>
                    {usStates.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="text-red-500">*</span> Zip
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.zip}
                    onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country
                  </label>
                  <select
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="United States">United States</option>
                    <option value="Canada">Canada</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            <h3 className="text-lg font-semibold bg-gray-600 text-white px-4 py-2 rounded mb-4">
              Family Members Information (First member must be an adult, 25+ years)
            </h3>
            <div className="space-y-6">
              {familyMembers.map((member, index) => (
                <div key={index} className="border-2 border-blue-200 rounded-lg p-6">
                  <h4 className="text-lg font-semibold mb-4 text-gray-800">
                    Family Member {index + 1}
                    {index === 0 && <span className="text-red-600 text-sm ml-2">(Must be adult, 25+ years)</span>}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <span className="text-red-500">*</span> First Name
                      </label>
                      <input
                        type="text"
                        required
                        value={member.firstName}
                        onChange={(e) => updateFamilyMember(index, 'firstName', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <span className="text-red-500">*</span> Last Name
                      </label>
                      <input
                        type="text"
                        required
                        value={member.lastName}
                        onChange={(e) => updateFamilyMember(index, 'lastName', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <span className="text-red-500">*</span> Date of Birth
                      </label>
                      <input
                        type="date"
                        required
                        value={member.dateOfBirth}
                        onChange={(e) => updateFamilyMember(index, 'dateOfBirth', e.target.value)}
                        max={new Date(new Date().setFullYear(new Date().getFullYear() - (index === 0 ? 25 : 11))).toISOString().split('T')[0]}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {index === 0 && (
                        <p className="text-xs text-red-600 mt-1">Must be at least 25 years old</p>
                      )}
                      {index > 0 && (
                        <p className="text-xs text-gray-500 mt-1">Minimum age: 11 years</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Age
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={member.age || ''}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                        placeholder="Auto-calculated"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <span className="text-red-500">*</span> Camper Category
                      </label>
                      <select
                        required
                        value={member.camperCategory}
                        onChange={(e) => updateFamilyMember(index, 'camperCategory', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select</option>
                        <option value="Middle School">Middle School</option>
                        <option value="High School">High School</option>
                        <option value="College">College</option>
                        <option value="Adults">Adults</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Time Attending
                      </label>
                      <select
                        value={member.firstTimeAttending}
                        onChange={(e) => updateFamilyMember(index, 'firstTimeAttending', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <span className="text-red-500">*</span> Email
                      </label>
                      <input
                        type="email"
                        required
                        value={member.email}
                        onChange={(e) => updateFamilyMember(index, 'email', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <span className="text-red-500">*</span> Confirm Email
                      </label>
                      <input
                        type="email"
                        required
                        value={member.confirmEmail}
                        onChange={(e) => updateFamilyMember(index, 'confirmEmail', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <span className="text-red-500">*</span> Contact Number
                      </label>
                      <input
                        type="tel"
                        required
                        value={member.mobileNumber}
                        onChange={(e) => updateFamilyMember(index, 'mobileNumber', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Camp Volunteer?
                      </label>
                      <select
                        value={member.campVolunteer}
                        onChange={(e) => updateFamilyMember(index, 'campVolunteer', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select (Optional)</option>
                        <option value="Student leader">Student leader</option>
                        <option value="Cabin Leader">Cabin Leader</option>
                        <option value="Core Leader">Core Leader</option>
                        <option value="Worship team">Worship team</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <span className="text-red-500">*</span> T-Shirt Size
                      </label>
                      <select
                        required
                        value={member.tshirtSize}
                        onChange={(e) => updateFamilyMember(index, 'tshirtSize', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select</option>
                        <option value="Youth small">Youth small</option>
                        <option value="Youth Medium">Youth Medium</option>
                        <option value="Youth Large">Youth Large</option>
                        <option value="Adult small">Adult small</option>
                        <option value="Adult Medium">Adult Medium</option>
                        <option value="Adult Large">Adult Large</option>
                        <option value="Adult XL">Adult XL</option>
                        <option value="Adult XXL">Adult XXL</option>
                      </select>
                    </div>
                    {(member.camperCategory === 'Adults') ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <span className="text-red-500">*</span> Emergency Contact Name
                          </label>
                          <input
                            type="text"
                            required
                            value={member.emergencyContactName}
                            onChange={(e) => updateFamilyMember(index, 'emergencyContactName', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <span className="text-red-500">*</span> Emergency Contact Phone
                          </label>
                          <input
                            type="tel"
                            required
                            value={member.emergencyContactPhone}
                            onChange={(e) => updateFamilyMember(index, 'emergencyContactPhone', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <span className="text-red-500">*</span> Parent/Guardian Name
                          </label>
                          <input
                            type="text"
                            required
                            value={member.parentGuardianName}
                            onChange={(e) => updateFamilyMember(index, 'parentGuardianName', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <span className="text-red-500">*</span> Parent/Guardian Phone
                          </label>
                          <input
                            type="tel"
                            required
                            value={member.parentGuardianPhone}
                            onChange={(e) => updateFamilyMember(index, 'parentGuardianPhone', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Consent Agreement */}
        <div>
          <h3 className="text-lg font-semibold bg-gray-600 text-white px-4 py-2 rounded mb-4">Consent Agreement</h3>
          <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-6 mb-4">
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              I authorize ICPF to provide medical treatment to my child when needed. I understand that every effort will be made to contact me regarding medical attention given to my child. I further acknowledge that I am responsible for costs associated with any medical and or related services provided to my child. I also understand that I am fully liable for any damage caused intentionally or otherwise by my child. Damage caused by my child will be billed directly to me as the responsible party. My child is willing to cooperate with the overall spirit and schedule of the camp. My child will obey and adhere to the Camp Leaders' directions and security policies. I agree that my child's failure to comply with Camp Leaders' directions and security policy will result in immediate expulsion from the Camp without refund of the Registration Fee.
            </p>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={consentAccepted}
                onChange={(e) => setConsentAccepted(e.target.checked)}
                className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                <span className="text-red-500">*</span> I have read and agree to the terms and conditions stated above
              </span>
            </label>
          </div>
        </div>

        {/* Payment Information */}
        <div>
          <h3 className="text-lg font-semibold bg-gray-600 text-white px-4 py-2 rounded mb-4">Payment Information</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <span className="text-red-500">*</span> Payment Method
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="card"
                  checked={paymentMethod === 'card'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mr-2"
                />
                Credit/Debit Card
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="check"
                  checked={paymentMethod === 'check'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mr-2"
                />
                Check
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="cash"
                  checked={paymentMethod === 'cash'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mr-2"
                />
                Cash
              </label>
            </div>
          </div>

          {paymentMethod === 'card' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Card Number
                </label>
                <input
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  value={cardDetails.number}
                  onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiry
                </label>
                <input
                  type="text"
                  placeholder="MM/YY"
                  value={cardDetails.expiry}
                  onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CVV
                </label>
                <input
                  type="text"
                  placeholder="123"
                  value={cardDetails.cvv}
                  onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {(paymentMethod === 'check' || paymentMethod === 'cash') && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                {paymentMethod === 'check' 
                  ? 'Please bring your check to the camp office on the first day.'
                  : 'Please bring cash payment to the camp office on the first day.'
                }
              </p>
            </div>
          )}

          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total Amount:</span>
              <span className="text-2xl font-bold text-blue-600">
                ${getTotalAmount()}
              </span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={processing}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition disabled:opacity-50"
        >
          {processing ? 'Processing...' : 'Complete Registration'}
        </button>
      </form>
    </div>
  );
}

// Check-In View Component
function CheckInView({ registrations, onCheckIn }) {
  const [scanMode, setScanMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [scannedCode, setScannedCode] = useState('');

  const confirmedRegistrations = registrations.filter(r => r.status === 'confirmed');
  
  const filteredRegistrations = confirmedRegistrations.filter(reg =>
    reg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reg.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reg.qrCode.includes(searchTerm)
  );

  const handleQRScan = (code) => {
    const registration = confirmedRegistrations.find(r => r.qrCode === code);
    if (registration && !registration.checkedIn) {
      onCheckIn(registration.id);
      setScannedCode(code);
      setTimeout(() => setScannedCode(''), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Check-In</h2>
        
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setScanMode(!scanMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              scanMode
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Camera className="w-5 h-5" />
            {scanMode ? 'Stop Scanning' : 'Scan QR Code'}
          </button>
          
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by name, email, or QR code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {scanMode && (
          <div className="mb-6 p-6 bg-gray-100 rounded-lg text-center">
            <QrCode className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">QR Code Scanner Active</p>
            <p className="text-sm text-gray-500 mt-2">
              In production, this would use device camera to scan QR codes
            </p>
            <input
              type="text"
              placeholder="Or paste QR code here..."
              onChange={(e) => {
                if (e.target.value) {
                  handleQRScan(e.target.value);
                  e.target.value = '';
                }
              }}
              className="mt-4 px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        )}

        {scannedCode && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-800">Successfully checked in!</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredRegistrations.map(reg => (
                <tr key={reg.id}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{reg.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{reg.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="capitalize">{reg.type}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {reg.checkedIn ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        Checked In
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-500">
                        <Clock className="w-4 h-4" />
                        Not Checked In
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {!reg.checkedIn && (
                      <button
                        onClick={() => onCheckIn(reg.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition"
                      >
                        Check In
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredRegistrations.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No confirmed registrations found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Lodge Management Component
function LodgeManagement({ lodges, setLodges, registrations, onAssignRoom }) {
  const [showAddLodge, setShowAddLodge] = useState(false);
  const [newLodge, setNewLodge] = useState({ name: '', totalRooms: 0 });
  const [selectedLodge, setSelectedLodge] = useState(null);
  const [assigningTo, setAssigningTo] = useState(null);

  const handleAddLodge = () => {
    const lodge = {
      id: 'lodge_' + Date.now(),
      name: newLodge.name,
      totalRooms: parseInt(newLodge.totalRooms),
      assignedRooms: []
    };
    setLodges([...lodges, lodge]);
    setNewLodge({ name: '', totalRooms: 0 });
    setShowAddLodge(false);
  };

  const unassignedRegistrations = registrations.filter(r => !r.lodgeId);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Lodge Management</h2>
          <button
            onClick={() => setShowAddLodge(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          >
            Add Lodge
          </button>
        </div>

        {showAddLodge && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-4">Add New Lodge</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lodge Name
                </label>
                <input
                  type="text"
                  value={newLodge.name}
                  onChange={(e) => setNewLodge({ ...newLodge, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Rooms
                </label>
                <input
                  type="number"
                  value={newLodge.totalRooms}
                  onChange={(e) => setNewLodge({ ...newLodge, totalRooms: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleAddLodge}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
              >
                Save
              </button>
              <button
                onClick={() => setShowAddLodge(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lodges.map(lodge => (
            <div key={lodge.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{lodge.name}</h3>
                  <p className="text-sm text-gray-600">
                    {lodge.assignedRooms.length} / {lodge.totalRooms} rooms assigned
                  </p>
                </div>
                <button
                  onClick={() => setSelectedLodge(selectedLodge === lodge.id ? null : lodge.id)}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  {selectedLodge === lodge.id ? 'Hide' : 'Manage'}
                </button>
              </div>

              {selectedLodge === lodge.id && (
                <div className="mt-4 border-t pt-4">
                  <h4 className="font-medium mb-2">Assign Rooms</h4>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        const roomNumber = lodge.assignedRooms.length + 1;
                        if (roomNumber <= lodge.totalRooms) {
                          onAssignRoom(e.target.value, lodge.id, roomNumber);
                        }
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2"
                  >
                    <option value="">Select a registrant...</option>
                    {unassignedRegistrations.map(reg => (
                      <option key={reg.id} value={reg.id}>
                        {reg.name} ({reg.type})
                      </option>
                    ))}
                  </select>

                  {lodge.assignedRooms.length > 0 && (
                    <div className="mt-4">
                      <h5 className="text-sm font-medium mb-2">Assigned Rooms:</h5>
                      <div className="space-y-1">
                        {lodge.assignedRooms.map((assignment, idx) => {
                          const reg = registrations.find(r => r.id === assignment.registrationId);
                          return (
                            <div key={idx} className="text-sm bg-gray-50 p-2 rounded">
                              Room {assignment.roomNumber}: {reg?.name}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {lodges.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No lodges created yet. Click "Add Lodge" to get started.
          </div>
        )}
      </div>
    </div>
  );
}

// Badge Printing Component
function BadgePrinting({ registrations, lodges }) {
  const [selectedReg, setSelectedReg] = useState(null);
  const printRef = useRef(null);

  const confirmedRegistrations = registrations.filter(r => r.status === 'confirmed');

  const handlePrint = (registration) => {
    setSelectedReg(registration);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <>
      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: 3.375in 2.125in;
            margin: 0;
          }
          * {
            visibility: hidden;
          }
          .printable-badge, .printable-badge * {
            visibility: visible;
          }
          .printable-badge {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 3.375in !important;
            height: 2.125in !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print, .no-print * {
            display: none !important;
            visibility: hidden !important;
          }
        }
      `}</style>

      <div className="space-y-6 no-print">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Print Badges</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {confirmedRegistrations.map(reg => {
              const lodge = lodges.find(l => l.id === reg.lodgeId);
              return (
                <div key={reg.id} className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">{reg.name}</h3>
                  <p className="text-sm text-gray-600 mb-1">Type: {reg.type}</p>
                  <p className="text-sm text-gray-600 mb-1">Email: {reg.email}</p>
                  {lodge && (
                    <p className="text-sm text-gray-600 mb-3">
                      {lodge.name} - Room {reg.roomNumber}
                    </p>
                  )}
                  <button
                    onClick={() => handlePrint(reg)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition flex items-center justify-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Print Badge
                  </button>
                </div>
              );
            })}
          </div>

          {confirmedRegistrations.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No confirmed registrations to print badges for
            </div>
          )}
        </div>
      </div>

      {/* Printable Badge (hidden on screen, visible when printing) */}
      {selectedReg && (
        <div className="printable-badge" ref={printRef} style={{ position: 'absolute', left: '-9999px', width: '3.375in', height: '2.125in' }}>
          <div className="w-full h-full border-2 border-blue-600 rounded-lg p-2 bg-white flex flex-col items-center justify-center" style={{ boxSizing: 'border-box' }}>
            <div className="text-center w-full">
              <h1 className="text-sm font-bold text-blue-600 mb-0.5 leading-tight">ICPF Awake Camp 2025</h1>
              <div className="border-t border-gray-300 my-0.5"></div>
              <h2 className="text-sm font-bold mb-0.5 leading-tight">{selectedReg.name}</h2>
              {selectedReg.camperCategory && (
                <p className="text-xs font-semibold text-gray-700 mb-0.5 leading-tight">{selectedReg.camperCategory}</p>
              )}
              {selectedReg.lodgeId && (
                <div className="my-0.5">
                  <p className="text-xs font-semibold text-gray-800 leading-tight">
                    {lodges.find(l => l.id === selectedReg.lodgeId)?.name}
                  </p>
                  {selectedReg.roomNumber && (
                    <p className="text-xs font-bold text-gray-700 leading-tight">Room {selectedReg.roomNumber}</p>
                  )}
                </div>
              )}
              <div className="mt-0.5 p-0.5 bg-gray-100 rounded">
                <p className="text-xs font-mono leading-tight">{selectedReg.qrCode}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Export View Component
function ExportView({ registrations, lodges }) {
  const exportToCSV = () => {
    const headers = [
      'First Name',
      'Last Name',
      'Middle Name',
      'Gender',
      'Camper Category',
      'Email',
      'Mobile Number',
      'Home Phone',
      'Address Line 1',
      'Address Line 2',
      'City',
      'State',
      'Zip',
      'Country',
      'First Time Attending',
      'T-Shirt Size',
      'Allergies',
      'Allergy Description',
      'Emergency Contact Name',
      'Emergency Contact Relationship',
      'Emergency Contact Phone',
      'Parent/Guardian Name',
      'Parent/Guardian Email',
      'Parent/Guardian Phone',
      'Type',
      'Registration Status',
      'Payment Status',
      'Payment Method',
      'Amount',
      'Lodge',
      'Room Number',
      'Checked In',
      'Check-In Time',
      'QR Code',
      'Registered At'
    ];

    const rows = registrations.map(reg => {
      const lodge = lodges.find(l => l.id === reg.lodgeId);
      return [
        reg.firstName || '',
        reg.lastName || '',
        reg.middleName || '',
        reg.gender || '',
        reg.camperCategory || '',
        reg.email,
        reg.mobileNumber || '',
        reg.homePhone || '',
        reg.addressLine1 || '',
        reg.addressLine2 || '',
        reg.city || '',
        reg.state || '',
        reg.zip || '',
        reg.country || '',
        reg.firstTimeAttending || '',
        reg.tshirtSize || '',
        reg.allergies || '',
        reg.allergyDescription || '',
        reg.emergencyContactName || '',
        reg.emergencyContactRelationship || '',
        reg.emergencyContactPhone || '',
        reg.parentGuardianName || '',
        reg.parentGuardianEmail || '',
        reg.parentGuardianPhone || '',
        reg.type,
        reg.status,
        reg.paymentStatus,
        reg.paymentMethod,
        reg.amount,
        lodge?.name || 'Not Assigned',
        reg.roomNumber || 'Not Assigned',
        reg.checkedIn ? 'Yes' : 'No',
        reg.checkInTime || 'N/A',
        reg.qrCode,
        new Date(reg.registeredAt).toLocaleString()
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `camp-registrations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Export Data</h2>
      
      <div className="space-y-6">
        <div className="border rounded-lg p-6">
          <div className="flex items-start gap-4">
            <Download className="w-8 h-8 text-blue-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">Export All Registrations</h3>
              <p className="text-gray-600 mb-4">
                Download a CSV file containing all registration data including personal information,
                payment status, room assignments, and check-in status.
              </p>
              <button
                onClick={exportToCSV}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download CSV
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">Total Registrations</h4>
            <p className="text-3xl font-bold text-blue-600">{registrations.length}</p>
          </div>
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">Confirmed</h4>
            <p className="text-3xl font-bold text-green-600">
              {registrations.filter(r => r.status === 'confirmed').length}
            </p>
          </div>
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">Checked In</h4>
            <p className="text-3xl font-bold text-purple-600">
              {registrations.filter(r => r.checkedIn).length}
            </p>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-4">Export Preview</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Mobile</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">T-Shirt</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {registrations.slice(0, 5).map(reg => {
                  return (
                    <tr key={reg.id}>
                      <td className="px-4 py-2">{reg.name}</td>
                      <td className="px-4 py-2">{reg.email}</td>
                      <td className="px-4 py-2">{reg.mobileNumber || 'N/A'}</td>
                      <td className="px-4 py-2">{reg.type}</td>
                      <td className="px-4 py-2">
                        <StatusBadge status={reg.status} />
                      </td>
                      <td className="px-4 py-2">{reg.tshirtSize || 'N/A'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {registrations.length > 5 && (
            <p className="text-sm text-gray-500 mt-2">
              Showing 5 of {registrations.length} registrations
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Admin Registrations Component
function AdminRegistrations({ registrations, onUpdateStatus, onUpdateRegistration }) {
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRegistration, setExpandedRegistration] = useState(null);
  const [sortBy, setSortBy] = useState('registeredAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [editingRegistration, setEditingRegistration] = useState(null);
  const [editFormData, setEditFormData] = useState(null);

  const filteredRegistrations = registrations
    .filter(reg => {
      const matchesStatus = filterStatus === 'all' || reg.status === filterStatus;
      const matchesSearch = 
        reg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.qrCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.mobileNumber?.includes(searchTerm);
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      if (sortBy === 'registeredAt') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

  const handleApprove = (registrationId) => {
    onUpdateStatus(registrationId, 'confirmed');
    // Send confirmation email with payment details
    const registration = registrations.find(r => r.id === registrationId);
    if (registration) {
      const paymentMode = registration.paymentMethod || 'Not specified';
      const paymentDate = registration.paymentDate 
        ? new Date(registration.paymentDate).toLocaleDateString() 
        : registration.transactionId 
          ? new Date(registration.registeredAt).toLocaleDateString() 
          : 'Pending';
      
      const emailBody = `Dear ${registration.name},

Your registration for ICPF Awake Camp 2025 has been confirmed!

Registration Details:
- Registration Code: ${registration.qrCode}
- Registration Type: ${registration.type}
- Amount: $${registration.amount}
- Payment Mode: ${paymentMode}
- Payment Date: ${paymentDate}
${registration.transactionId ? `- Transaction ID: ${registration.transactionId}` : ''}

We look forward to seeing you at the camp!

Best regards,
ICPF Awake Camp Team`;

      sendEmail(
        registration.email,
        'ICPF Awake Camp Registration Confirmed',
        emailBody
      );
    }
  };

  const handleSendPaymentReminder = async (registrationId) => {
    const registration = registrations.find(r => r.id === registrationId);
    if (registration && registration.paymentStatus !== 'paid') {
      const emailBody = `Dear ${registration.name},

This is a friendly reminder that your payment for ICPF Awake Camp 2025 is pending.

Registration Details:
- Registration Code: ${registration.qrCode}
- Amount Due: $${registration.amount}
- Payment Method: ${registration.paymentMethod || 'Not specified'}

Please complete your payment to confirm your registration. If you have already made the payment, please contact us.

Best regards,
ICPF Awake Camp Team`;

      await sendEmail(
        registration.email,
        'Payment Reminder - ICPF Awake Camp 2025',
        emailBody
      );
      alert('Payment reminder email sent!');
    }
  };

  const handleResendConfirmation = async (registrationId) => {
    const registration = registrations.find(r => r.id === registrationId);
    if (registration && registration.status === 'confirmed') {
      const paymentMode = registration.paymentMethod || 'Not specified';
      const paymentDate = registration.paymentDate 
        ? new Date(registration.paymentDate).toLocaleDateString() 
        : registration.transactionId 
          ? new Date(registration.registeredAt).toLocaleDateString() 
          : 'Pending';
      
      const emailBody = `Dear ${registration.name},

Your registration for ICPF Awake Camp 2025 has been confirmed!

Registration Details:
- Registration Code: ${registration.qrCode}
- Registration Type: ${registration.type}
- Amount: $${registration.amount}
- Payment Mode: ${paymentMode}
- Payment Date: ${paymentDate}
${registration.transactionId ? `- Transaction ID: ${registration.transactionId}` : ''}

We look forward to seeing you at the camp!

Best regards,
ICPF Awake Camp Team`;

      await sendEmail(
        registration.email,
        'ICPF Awake Camp Registration Confirmed',
        emailBody
      );
      alert('Confirmation email resent!');
    }
  };

  const handleReject = (registrationId) => {
    if (window.confirm('Are you sure you want to reject this registration?')) {
      onUpdateStatus(registrationId, 'rejected');
      const registration = registrations.find(r => r.id === registrationId);
      if (registration) {
        sendEmail(
          registration.email,
          'ICPF Awake Camp Registration Update',
          `Dear ${registration.name}, your registration has been reviewed. Please contact us for more information.`
        );
      }
    }
  };

  const handleEdit = (registration) => {
    setEditFormData({
      firstName: registration.firstName || '',
      lastName: registration.lastName || '',
      middleName: registration.middleName || '',
      gender: registration.gender || '',
      camperCategory: registration.camperCategory || '',
      email: registration.email || '',
      mobileNumber: registration.mobileNumber || '',
      homePhone: registration.homePhone || '',
      churchName: registration.churchName || '',
      pastorName: registration.pastorName || '',
      addressLine1: registration.addressLine1 || '',
      addressLine2: registration.addressLine2 || '',
      city: registration.city || '',
      state: registration.state || '',
      zip: registration.zip || '',
      country: registration.country || 'United States',
      countryCode: registration.countryCode || 'United States +1',
      firstTimeAttending: registration.firstTimeAttending || '',
      tshirtSize: registration.tshirtSize || '',
      allergies: registration.allergies || '',
      allergyDescription: registration.allergyDescription || '',
      emergencyContactName: registration.emergencyContactName || '',
      emergencyContactRelationship: registration.emergencyContactRelationship || '',
      emergencyContactPhone: registration.emergencyContactPhone || '',
      parentGuardianName: registration.parentGuardianName || '',
      parentGuardianEmail: registration.parentGuardianEmail || '',
      parentGuardianPhone: registration.parentGuardianPhone || '',
      type: registration.type || '',
      amount: registration.amount || 0,
      paymentMethod: registration.paymentMethod || '',
      paymentDate: registration.paymentDate || '',
      paymentConfirmation: registration.paymentConfirmation || '',
      paymentStatus: registration.paymentStatus || 'pending',
      status: registration.status || 'pending',
    });
    setEditingRegistration(registration.id);
  };

  const handleSaveEdit = () => {
    if (editingRegistration && editFormData) {
      onUpdateRegistration(editingRegistration, editFormData);
      setEditingRegistration(null);
      setEditFormData(null);
      setExpandedRegistration(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingRegistration(null);
    setEditFormData(null);
  };

  const stats = {
    total: registrations.length,
    pending: registrations.filter(r => r.status === 'pending').length,
    confirmed: registrations.filter(r => r.status === 'confirmed').length,
    rejected: registrations.filter(r => r.status === 'rejected').length,
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Manage Registrations</h2>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Total</p>
            <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Confirmed</p>
            <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Rejected</p>
            <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by name, email, phone, or QR code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="registeredAt">Sort by Date</option>
              <option value="name">Sort by Name</option>
              <option value="status">Sort by Status</option>
              <option value="type">Sort by Type</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>

        {/* Registrations Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registered</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y bg-white">
              {filteredRegistrations.map(reg => (
                <React.Fragment key={reg.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{reg.name}</div>
                      <div className="text-sm text-gray-500">{reg.mobileNumber || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{reg.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="capitalize">{reg.type}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={reg.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <PaymentBadge status={reg.paymentStatus} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-semibold">${reg.amount || 0}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(reg.registeredAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 flex-wrap">
                        {reg.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(reg.id)}
                              className="bg-green-600 hover:bg-green-700 text-white p-1.5 rounded transition"
                              title="Approve/Confirm"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReject(reg.id)}
                              className="bg-red-600 hover:bg-red-700 text-white p-1.5 rounded transition"
                              title="Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {reg.status === 'confirmed' && (
                          <span className="text-green-600 text-xs flex items-center" title="Confirmed">
                            <CheckCircle className="w-4 h-4" />
                          </span>
                        )}
                        {reg.status === 'rejected' && (
                          <span className="text-red-600 text-xs flex items-center" title="Rejected">
                            <XCircle className="w-4 h-4" />
                          </span>
                        )}
                        <button
                          onClick={() => setExpandedRegistration(expandedRegistration === reg.id ? null : reg.id)}
                          className="text-blue-600 hover:text-blue-700 p-1.5 rounded hover:bg-blue-50 transition"
                          title={expandedRegistration === reg.id ? 'Hide Details' : 'Show Details'}
                        >
                          <ListChecks className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(reg)}
                          className="text-purple-600 hover:text-purple-700 p-1.5 rounded hover:bg-purple-50 transition"
                          title="Edit Registration"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {reg.status === 'confirmed' && (
                          <button
                            onClick={() => handleResendConfirmation(reg.id)}
                            className="text-blue-600 hover:text-blue-700 p-1.5 rounded hover:bg-blue-50 transition"
                            title="Re-send Confirmation Email"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                        )}
                        {reg.paymentStatus !== 'paid' && reg.status !== 'rejected' && (
                          <button
                            onClick={() => handleSendPaymentReminder(reg.id)}
                            className="text-orange-600 hover:text-orange-700 p-1.5 rounded hover:bg-orange-50 transition"
                            title="Send Payment Reminder"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedRegistration === reg.id && (
                    <tr>
                      <td colSpan="8" className="px-6 py-4 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Full Name</p>
                            <p className="font-medium">{reg.name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Gender</p>
                            <p className="font-medium capitalize">{reg.gender || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Camper Category</p>
                            <p className="font-medium">{reg.camperCategory || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Email</p>
                            <p className="font-medium">{reg.email}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Mobile Number</p>
                            <p className="font-medium">{reg.mobileNumber || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Home Phone</p>
                            <p className="font-medium">{reg.homePhone || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Address</p>
                            <p className="font-medium">
                              {reg.addressLine1 || 'N/A'}
                              {reg.city && `, ${reg.city}`}
                              {reg.state && `, ${reg.state}`}
                              {reg.zip && ` ${reg.zip}`}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">T-Shirt Size</p>
                            <p className="font-medium">{reg.tshirtSize || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">First Time Attending</p>
                            <p className="font-medium capitalize">{reg.firstTimeAttending || 'N/A'}</p>
                          </div>
                          {reg.allergies && reg.allergies !== 'none' && (
                            <div className="md:col-span-2">
                              <p className="text-xs text-gray-500 mb-1">Allergies</p>
                              <p className="font-medium capitalize">{reg.allergies}</p>
                              {reg.allergyDescription && (
                                <p className="text-sm text-gray-600 mt-1">{reg.allergyDescription}</p>
                              )}
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Emergency Contact</p>
                            <p className="font-medium">
                              {reg.emergencyContactName || 'N/A'}
                              {reg.emergencyContactRelationship && ` (${reg.emergencyContactRelationship})`}
                            </p>
                            <p className="text-sm text-gray-600">{reg.emergencyContactPhone || 'N/A'}</p>
                          </div>
                          {(reg.parentGuardianName || reg.parentGuardianEmail) && (
                            <div className="md:col-span-2">
                              <p className="text-xs text-gray-500 mb-1">Parent/Guardian</p>
                              <p className="font-medium">{reg.parentGuardianName || 'N/A'}</p>
                              <p className="text-sm text-gray-600">{reg.parentGuardianEmail || 'N/A'}</p>
                              <p className="text-sm text-gray-600">{reg.parentGuardianPhone || 'N/A'}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Payment Method</p>
                            <p className="font-medium capitalize">{reg.paymentMethod || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">QR Code</p>
                            <p className="font-mono text-sm">{reg.qrCode || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Registered At</p>
                            <p className="font-medium text-sm">
                              {new Date(reg.registeredAt).toLocaleString()}
                            </p>
                          </div>
                          {reg.checkedIn && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Check-In Time</p>
                              <p className="font-medium text-sm text-green-600">
                                {reg.checkInTime ? new Date(reg.checkInTime).toLocaleString() : 'N/A'}
                              </p>
                            </div>
                          )}
                          {reg.lodgeId && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Lodge Assignment</p>
                              <p className="font-medium">Room {reg.roomNumber || 'N/A'}</p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          
          {filteredRegistrations.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg">No registrations found</p>
              <p className="text-sm">Try adjusting your filters or search terms</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Registration Modal */}
      {editingRegistration && editFormData && (
        <EditRegistrationModal
          formData={editFormData}
          setFormData={setEditFormData}
          onSave={handleSaveEdit}
          onCancel={handleCancelEdit}
        />
      )}
    </div>
  );
}

// Edit Registration Modal Component
function EditRegistrationModal({ formData, setFormData, onSave, onCancel }) {
  const usStates = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 
    'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 
    'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 
    'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 
    'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 
    'Wisconsin', 'Wyoming'
  ];

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Edit Registration</h2>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Participant Information */}
          <div>
            <h3 className="text-lg font-semibold bg-gray-600 text-white px-4 py-2 rounded mb-4">Participant Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Middle Name</label>
                <input
                  type="text"
                  value={formData.middleName}
                  onChange={(e) => handleChange('middleName', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => handleChange('gender', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Camper Category</label>
                <select
                  value={formData.camperCategory}
                  onChange={(e) => handleChange('camperCategory', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select</option>
                  <option value="Middle School">Middle School</option>
                  <option value="High School">High School</option>
                  <option value="College">College</option>
                  <option value="Adults">Adults</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Church Name</label>
                <input
                  type="text"
                  value={formData.churchName || ''}
                  onChange={(e) => handleChange('churchName', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pastor Name</label>
                <input
                  type="text"
                  value={formData.pastorName || ''}
                  onChange={(e) => handleChange('pastorName', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
                <input
                  type="tel"
                  value={formData.mobileNumber}
                  onChange={(e) => handleChange('mobileNumber', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Home Phone</label>
                <input
                  type="tel"
                  value={formData.homePhone}
                  onChange={(e) => handleChange('homePhone', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">T-Shirt Size</label>
                <select
                  value={formData.tshirtSize}
                  onChange={(e) => handleChange('tshirtSize', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select</option>
                  <option value="Youth small">Youth small</option>
                  <option value="Youth Medium">Youth Medium</option>
                  <option value="Youth Large">Youth Large</option>
                  <option value="Adult small">Adult small</option>
                  <option value="Adult Medium">Adult Medium</option>
                  <option value="Adult Large">Adult Large</option>
                  <option value="Adult XL">Adult XL</option>
                  <option value="Adult XXL">Adult XXL</option>
                </select>
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div>
            <h3 className="text-lg font-semibold bg-gray-600 text-white px-4 py-2 rounded mb-4">Address Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 1</label>
                <input
                  type="text"
                  value={formData.addressLine1}
                  onChange={(e) => handleChange('addressLine1', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 2</label>
                <input
                  type="text"
                  value={formData.addressLine2}
                  onChange={(e) => handleChange('addressLine2', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                <select
                  value={formData.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select</option>
                  {usStates.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Zip</label>
                <input
                  type="text"
                  value={formData.zip}
                  onChange={(e) => handleChange('zip', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                <select
                  value={formData.country}
                  onChange={(e) => handleChange('country', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="United States">United States</option>
                  <option value="Canada">Canada</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div>
            <h3 className="text-lg font-semibold bg-gray-600 text-white px-4 py-2 rounded mb-4">Emergency Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Relationship</label>
                <input
                  type="text"
                  value={formData.emergencyContactRelationship}
                  onChange={(e) => handleChange('emergencyContactRelationship', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={formData.emergencyContactName}
                  onChange={(e) => handleChange('emergencyContactName', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.emergencyContactPhone}
                  onChange={(e) => handleChange('emergencyContactPhone', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Parent/Guardian Information */}
          <div>
            <h3 className="text-lg font-semibold bg-gray-600 text-white px-4 py-2 rounded mb-4">Parent/Guardian Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={formData.parentGuardianName}
                  onChange={(e) => handleChange('parentGuardianName', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.parentGuardianEmail}
                  onChange={(e) => handleChange('parentGuardianEmail', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.parentGuardianPhone}
                  onChange={(e) => handleChange('parentGuardianPhone', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Medical Information */}
          <div>
            <h3 className="text-lg font-semibold bg-gray-600 text-white px-4 py-2 rounded mb-4">Medical Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Allergies</label>
                <select
                  value={formData.allergies}
                  onChange={(e) => handleChange('allergies', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select</option>
                  <option value="none">None</option>
                  <option value="food">Food Allergies</option>
                  <option value="medication">Medication Allergies</option>
                  <option value="environmental">Environmental Allergies</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Allergy Description</label>
                <input
                  type="text"
                  value={formData.allergyDescription}
                  onChange={(e) => handleChange('allergyDescription', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Registration & Payment Information */}
          <div>
            <h3 className="text-lg font-semibold bg-gray-600 text-white px-4 py-2 rounded mb-4">Registration & Payment Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Registration Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="student">Student</option>
                  <option value="adult">Adult</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => handleChange('paymentMethod', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="card">Credit/Debit Card</option>
                  <option value="check">Check</option>
                  <option value="cash">Cash</option>
                </select>
              </div>
              {formData.paymentMethod && formData.paymentMethod !== 'card' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Date</label>
                    <input
                      type="date"
                      value={formData.paymentDate ? formData.paymentDate.split('T')[0] : ''}
                      onChange={(e) => handleChange('paymentDate', e.target.value ? new Date(e.target.value).toISOString() : '')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Confirmation</label>
                    <input
                      type="text"
                      value={formData.paymentConfirmation || ''}
                      onChange={(e) => handleChange('paymentConfirmation', e.target.value)}
                      placeholder="Check number, receipt number, etc."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
                <select
                  value={formData.paymentStatus}
                  onChange={(e) => handleChange('paymentStatus', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="processing">Processing</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => handleChange('amount', parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Time Attending</label>
                <select
                  value={formData.firstTimeAttending}
                  onChange={(e) => handleChange('firstTimeAttending', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <button
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={onSave}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function StatCard({ title, value, icon: Icon, color }) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    purple: 'bg-purple-100 text-purple-600'
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800'
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function PaymentBadge({ status }) {
  const colors = {
    paid: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    failed: 'bg-red-100 text-red-800'
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}