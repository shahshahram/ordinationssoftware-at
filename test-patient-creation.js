const axios = require('axios');

async function testPatientCreation() {
  try {
    // Zuerst einloggen
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'admin@ordinationssoftware.at',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('Login successful, token received');
    
    // Test-Patient erstellen
    const patientData = {
      firstName: 'Test',
      lastName: 'Patient',
      dateOfBirth: '1990-01-01',
      gender: 'm',
      socialSecurityNumber: '1234567890',
      insuranceProvider: 'ÖGK (Österreichische Gesundheitskasse)',
      phone: '1234567890',
      address: {
        street: 'Teststraße 1',
        zipCode: '1234',
        city: 'Wien',
        country: 'Österreich'
      },
      dataProtectionConsent: true,
      allergies: ['Pollen', 'Nüsse'],
      currentMedications: ['Aspirin', 'Ibuprofen'],
      preExistingConditions: ['Diabetes'],
      smokingStatus: 'non-smoker'
    };
    
    console.log('Creating patient with data:', JSON.stringify(patientData, null, 2));
    
    const response = await axios.post('http://localhost:5001/api/patients-extended', patientData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Patient created successfully:', response.data);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testPatientCreation();



