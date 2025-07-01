const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'Uploads')));

const pool = new Pool({
  user: 'postgres',
  host: 'postgres',
  database: 'employee_db',
  password: 'admin123',
  port: 5432,
});

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

async function generateEmpId() {
  try {
    const result = await pool.query('SELECT emp_id FROM onboarding_records WHERE emp_id LIKE \'ATS0%\' ORDER BY emp_id DESC LIMIT 1');
    if (result.rows.length === 0) {
      return 'ATS0001';
    }
    const lastEmpId = result.rows[0].emp_id;
    const lastNumber = parseInt(lastEmpId.slice(4), 10);
    const newNumber = (lastNumber + 1).toString().padStart(3, '0');
    return `ATS0${newNumber}`;
  } catch (error) {
    console.error('Error generating emp_id:', error.message);
    throw error;
  }
}

pool.connect()
  .then(async () => {
    console.log('Connected to PostgreSQL database');
    await createTable();
  })
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'Uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const sanitizedFileName = file.originalname.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
    const timestamp = Date.now();
    const uniqueFileName = `${timestamp}_${sanitizedFileName}`;
    cb(null, uniqueFileName);
  }
});

const upload = multer({
  storage: storage,
  limits: { 
    fileSize: (req, file) => {
      return file.fieldname === 'profilePic' ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
    }
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = {
      profilePic: ['image/jpeg', 'image/png'],
      idProof: ['application/pdf', 'image/jpeg', 'image/png'],
      sscCertificate: ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      interCertificate: ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      degreeCertificate: ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      experienceLetter: ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    };
    if (allowedTypes[file.fieldname]?.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type for ${file.fieldname}. Allowed: ${allowedTypes[file.fieldname]?.map(type => type.split('/')[1].toUpperCase()).join(', ')}`));
    }
  }
}).fields([
  { name: 'profilePic', maxCount: 1 },
  { name: 'idProof', maxCount: 1 },
  { name: 'sscCertificate', maxCount: 1 },
  { name: 'interCertificate', maxCount: 1 },
  { name: 'degreeCertificate', maxCount: 1 },
  { name: 'experienceLetter', maxCount: 1 }
]);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.post('/api/employees', (req, res, next) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error('File upload error:', err);
      return res.status(400).json({ error: err.message || 'File upload error' });
    }
    try {
      const formData = req.body;
      console.log('Form data received:', formData);
      console.log('Files received:', req.files);

      const empId = await generateEmpId();

      const getDateValue = (value) => {
        if (!value || value.trim() === '' || value === 'null') {
          return null;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          console.warn(`Invalid date format for value: ${value}`);
          return null;
        }
        return value;
      };

      const result = await pool.query(
        `INSERT INTO onboarding_records (
          emp_id, full_name, email, phone, department, job_role, job_start_date,
          street_address, city, state, zip_code, dob, status,
          profile_pic_name, profile_pic_path, id_proof_name, id_proof_path,
          ssc_certificate_name, ssc_certificate_path, inter_certificate_name, inter_certificate_path,
          degree_certificate_name, degree_certificate_path, experience_letter_name, experience_letter_path,
          ssc_institution, ssc_year, inter_institution, inter_year, degree, institution, graduation_year,
          bank_name, mobile_number, account_number, ifsc_number,
          prev_company_name, prev_job_role, prev_employment_start, prev_employment_end,
          emergency_contact_name, emergency_contact_relationship, emergency_contact_phone, emergency_contact_address,
          created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39,
          $40, $41, $42, $43, $44, $45
        ) RETURNING id, emp_id`,
        [
          empId,
          formData.fullName,
          formData.email,
          formData.phone,
          formData.department,
          formData.jobRole,
          getDateValue(formData.jobStartDate),
          formData.streetAddress,
          formData.city,
          formData.state,
          formData.zipCode,
          getDateValue(formData.dob),
          'Pending',
          req.files['profilePic'] ? req.files['profilePic'][0].originalname : null,
          req.files['profilePic'] ? req.files['profilePic'][0].path : null,
          req.files['idProof'] ? req.files['idProof'][0].originalname : null,
          req.files['idProof'] ? req.files['idProof'][0].path : null,
          req.files['sscCertificate'] ? req.files['sscCertificate'][0].originalname : null,
          req.files['sscCertificate'] ? req.files['sscCertificate'][0].path : null,
          req.files['interCertificate'] ? req.files['interCertificate'][0].originalname : null,
          req.files['interCertificate'] ? req.files['interCertificate'][0].path : null,
          req.files['degreeCertificate'] ? req.files['degreeCertificate'][0].originalname : null,
          req.files['degreeCertificate'] ? req.files['degreeCertificate'][0].path : null,
          req.files['experienceLetter'] ? req.files['experienceLetter'][0].originalname : null,
          req.files['experienceLetter'] ? req.files['experienceLetter'][0].path : null,
          formData.sscInstitution,
          formData.sscYear,
          formData.interInstitution,
          formData.interYear,
          formData.degree,
          formData.institution,
          formData.graduationYear,
          formData.bankName,
          formData.mobileNumber,
          formData.accountNumber,
          formData.ifscNumber,
          formData.prevCompanyName || null,
          formData.prevJobRole || null,
          getDateValue(formData.prevEmploymentStart),
          getDateValue(formData.prevEmploymentEnd),
          formData.emergencyContactName,
          formData.emergencyContactRelationship,
          formData.emergencyContactPhone,
          formData.emergencyContactAddress,
          new Date().toISOString()
        ]
      );
      console.log('Insert result:', result.rows[0]);
      return res.status(201).json({
        message: 'Employee onboarding form submitted successfully',
        id: result.rows[0].id,
        emp_id: result.rows[0].emp_id
      });
    } catch (error) {
      console.error('Error submitting form:', error.message);
      return res.status(500).json({ error: 'Failed to submit form data' });
    }
  });
});

app.get('/api/onboarding', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status;
    const search = req.query.search;

    let query = 'SELECT * FROM onboarding_records';
    let params = [];
    let conditions = [];
    let paramCount = 1;

    if (status) {
      conditions.push(`status = $${paramCount++}`);
      params.push(status);
    }

    if (search) {
      conditions.push(`(full_name ILIKE $${paramCount++} OR department ILIKE $${paramCount++} OR job_role ILIKE $${paramCount++} OR emp_id ILIKE $${paramCount++})`);
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    const totalResult = await pool.query(
      `SELECT COUNT(*) FROM onboarding_records${conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''}`,
      params.slice(0, paramCount - 3)
    );
    const total = parseInt(totalResult.rows[0].count);

    res.json({
      data: result.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching records:', error);
    res.status(500).json({ error: 'Failed to fetch records' });
  }
});

app.get('/api/onboarding/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM onboarding_records WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching record:', error);
    res.status(500).json({ error: 'Failed to fetch record' });
  }
});

app.get('/api/employees/active', async (req, res) => {
  try {
    const search = req.query.search;
    let query = "SELECT * FROM onboarding_records WHERE status = 'Active'";
    let params = [];
    let paramCount = 1;

    if (search) {
      query += ` AND (full_name ILIKE $${paramCount++} OR department ILIKE $${paramCount++} OR emp_id ILIKE $${paramCount++})`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error fetching active employees:', error);
    res.status(500).json({ error: 'Failed to fetch active employees' });
  }
});

app.get('/api/onboarding/:id/file/:field', async (req, res) => {
  try {
    const { id, field } = req.params;
    const fieldMap = {
      profilePic: { path: 'profile_pic_path', name: 'profile_pic_name' },
      idProof: { path: 'id_proof_path', name: 'id_proof_name' },
      sscCertificate: { path: 'ssc_certificate_path', name: 'ssc_certificate_name' },
      interCertificate: { path: 'inter_certificate_path', name: 'inter_certificate_name' },
      degreeCertificate: { path: 'degree_certificate_path', name: 'degree_certificate_name' },
      experienceLetter: { path: 'experience_letter_path', name: 'experience_letter_name' }
    };

    const dbField = fieldMap[field];
    if (!dbField) {
      return res.status(400).json({ error: 'Invalid file field' });
    }

    const result = await pool.query(`SELECT ${dbField.path}, ${dbField.name} FROM onboarding_records WHERE id = $1`, [id]);
    if (result.rows.length === 0 || !result.rows[0][dbField.path]) {
      return res.status(404).json({ error: 'File not found' });
    }

    const filePath = result.rows[0][dbField.path];
    const fileName = result.rows[0][dbField.name] || 'unnamed_file';
    const mimeType = getMimeType(fileName);

    res.setHeader('Content-Type', mimeType);
    if (field === 'profilePic') {
      res.setHeader('Content-Disposition', 'inline');
    } else {
      res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFileName(fileName)}"`);
    }
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

app.patch('/api/onboarding/:id', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Active', 'Rejected', 'Pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const updateResult = await pool.query(
      'UPDATE onboarding_records SET status = $1, updated_at = $2 WHERE id = $3 RETURNING *',
      [status, new Date().toISOString(), req.params.id]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json(updateResult.rows[0]);
  } catch (error) {
    console.error('Error updating record:', error);
    res.status(500).json({ error: 'Failed to update record' });
  }
});

function sanitizeFileName(fileName) {
  return fileName.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
}

function getMimeType(fileName) {
  const ext = path.extname(fileName).toLowerCase().slice(1);
  const mimeTypes = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

const PORT = process.env.PORT || 3077;
app.listen(PORT, () => {
  console.log(`Server running on http://51.20.6.123:${PORT}`);
});