async function createTable() {
  try {
    await pool.query(`

      CREATE TABLE onboarding_records (
        id SERIAL PRIMARY KEY,
        emp_id VARCHAR(7) UNIQUE,
        full_name VARCHAR(50) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        phone VARCHAR(10) NOT NULL,
        department VARCHAR(100) NOT NULL,
        job_role VARCHAR(100) NOT NULL,
        job_start_date DATE NOT NULL,
        street_address VARCHAR(100) NOT NULL,
        city VARCHAR(50) NOT NULL,
        state VARCHAR(50) NOT NULL,
        zip_code VARCHAR(6) NOT NULL,
        dob DATE NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Active', 'Rejected')),
        profile_pic_name VARCHAR(255),
        profile_pic_path VARCHAR(255),
        id_proof_name VARCHAR(255),
        id_proof_path VARCHAR(255),
        ssc_certificate_name VARCHAR(255),
        ssc_certificate_path VARCHAR(255),
        inter_certificate_name VARCHAR(255),
        inter_certificate_path VARCHAR(255),
        degree_certificate_name VARCHAR(255),
        degree_certificate_path VARCHAR(255),
        experience_letter_name VARCHAR(255),
        experience_letter_path VARCHAR(255),
        ssc_institution VARCHAR(200) NOT NULL,
        ssc_year INTEGER NOT NULL CHECK (ssc_year >= 1900 AND ssc_year <= 2026),
        inter_institution VARCHAR(200) NOT NULL,
        inter_year INTEGER NOT NULL CHECK (inter_year >= 1900 AND inter_year <= 2026),
        degree VARCHAR(100) NOT NULL,
        institution VARCHAR(200) NOT NULL,
        graduation_year INTEGER NOT NULL CHECK (graduation_year >= 1900 AND graduation_year <= 2026),
        bank_name VARCHAR(100) NOT NULL,
        mobile_number VARCHAR(10) NOT NULL,
        account_number VARCHAR(20) NOT NULL,
        ifsc_number VARCHAR(11) NOT NULL,
        prev_company_name VARCHAR(100),
        prev_job_role VARCHAR(100),
        prev_employment_start DATE,
        prev_employment_end DATE,
        emergency_contact_name VARCHAR(50) NOT NULL,
        emergency_contact_relationship VARCHAR(50) NOT NULL,
        emergency_contact_phone VARCHAR(10) NOT NULL,
        emergency_contact_address VARCHAR(100) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE
      );
    `);
    console.log('Table onboarding_records dropped and recreated successfully');
  } catch (error) {
    console.error('Error creating table:', error.message);
    process.exit(1);
  }
}