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
  host: 'localhost',
  database: 'employee_db',
  password: 'Veera@0134',
  port: 5432,
});

pool.connect()
  .then(() => console.log('Connected to PostgreSQL database'))
  .catch(err => console.error('Database connection error:', err));

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
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, PDF, DOC, and DOCX are allowed.'));
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

      // Helper function to handle date fields
      const getDateValue = (value) => {
        if (!value || value.trim() === '' || value === 'null') {
          return null;
        }
        // Validate date format (YYYY-MM-DD)
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
          emergency_contact_name, emergency_contact_relationship, emergency_contact_phone, emergency_contact_address
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
          $41, $42, $43, $44
        ) RETURNING id`,
        [
          formData.empId,
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
          formData.prevCompanyName,
          formData.prevJobRole,
          getDateValue(formData.prevEmploymentStart),
          getDateValue(formData.prevEmploymentEnd),
          formData.emergencyContactName,
          formData.emergencyContactRelationship,
          formData.emergencyContactPhone,
          formData.emergencyContactAddress
        ]
      );
      console.log('Insert result:', result.rows[0]);
      return res.status(201).json({
        message: 'Employee onboarding form submitted successfully',
        id: result.rows[0].id
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

    let query = 'SELECT * FROM onboarding_records';
    let params = [];
    let paramCount = 1;

    if (status) {
      query += ` WHERE status = $${paramCount++}`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    const totalResult = await pool.query(
      `SELECT COUNT(*) FROM onboarding_records${status ? ' WHERE status = $1' : ''}`,
      status ? [status] : []
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
    const result = await pool.query("SELECT * FROM onboarding_records WHERE status = 'Active'");
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
      profilePic: 'profile_pic_path',
      idProof: 'id_proof_path',
      sscCertificate: 'ssc_certificate_path',
      interCertificate: 'inter_certificate_path',
      degreeCertificate: 'degree_certificate_path',
      experienceLetter: 'experience_letter_path'
    };

    const dbField = fieldMap[field];
    if (!dbField) {
      return res.status(400).json({ error: 'Invalid file field' });
    }

    const result = await pool.query(`SELECT ${dbField} FROM onboarding_records WHERE id = $1`, [id]);
    if (result.rows.length === 0 || !result.rows[0][dbField]) {
      return res.status(404).json({ error: 'File not found' });
    }

    const filePath = result.rows[0][dbField];
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

app.patch('/api/onboarding/:id', async (req, res) => {
  try {
    if (!req.body.status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const updateResult = await pool.query(
      'UPDATE onboarding_records SET status = $1 WHERE id = $2 RETURNING *',
      [req.body.status, req.params.id]
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});