// Test script to check ICD-10 search functionality
const testICD10Search = async () => {
  try {
    console.log('🔍 Testing ICD-10 search...');
    
    // Test API directly
    const response = await fetch('http://localhost:5001/api/icd10/search?q=diabetes&year=2025&limit=5', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiNjhmM2UyYmM0OGEwYzgzYjgyOTUzYzA2In0sImlhdCI6MTc2MDk0MzE5OSwiZXhwIjoxNzYxMDI5NTk5fQ.YTrHsb8BCJH3UM5M79Na2G_cpkoNmTjESGVVUN78BPk'
      }
    });
    
    const data = await response.json();
    console.log('✅ API Response:', data);
    
    if (data.success && data.data && data.data.length > 0) {
      console.log('✅ Found', data.data.length, 'results');
      console.log('First result:', data.data[0]);
    } else {
      console.log('❌ No results found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

// Run test
testICD10Search();
