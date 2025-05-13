const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

app.use(express.static(path.join(__dirname, 'public')));

const uploadDir = path.join(__dirname, 'Uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const filetypes = /pdf|jpg|jpeg|png|doc|docx/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF, JPG, JPEG, PNG, DOC, DOCX files are allowed'));
        }
    }
});

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Veera@0134',
    database: 'hrms_db'
});

app.post('/api/employees', upload.fields([
    { name: 'experienceLetter', maxCount: 1 },
    { name: 'sscCertificate', maxCount: 1 },
    { name: 'interCertificate', maxCount: 1 },
    { name: 'degreeCertificate', maxCount: 1 },
    { name: 'profilePic', maxCount: 1 },
    { name: 'idProof', maxCount: 1 }
]), async (req, res) => {
    const {
        fullName, empId, email, phone, dob,
        streetAddress, city, state, zipCode,
        bankName, mobileNumber, accountNumber, ifscNumber,
        prevCompanyName, prevJobRole, prevEmploymentStart, prevEmploymentEnd,
        sscInstitution, sscYear,
        interInstitution, interYear,
        degree, institution, graduationYear,
        emergencyContactName, emergencyContactRelationship, emergencyContactPhone, emergencyContactAddress,
        jobRole, jobStartDate, department
    } = req.body;

    const files = req.files;
    const experienceLetterName = files.experienceLetter ? files.experienceLetter[0].filename : null;
    const sscCertificateName = files.sscCertificate ? files.sscCertificate[0].filename : null;
    const interCertificateName = files.interCertificate ? files.interCertificate[0].filename : null;
    const degreeCertificateName = files.degreeCertificate ? files.degreeCertificate[0].filename : null;
    const profilePicName = files.profilePic ? files.profilePic[0].filename : null;
    const idProofName = files.idProof ? files.idProof[0].filename : null;

    try {
        console.log('Inserting employee data:', { fullName, empId, email, department, jobRole });
        const [result] = await pool.query(
            `INSERT INTO employees (
                full_name, emp_id, email, phone, dob,
                street_address, city, state, zip_code,
                bank_name, mobile_number, account_number, ifsc_number,
                prev_company_name, prev_job_role, prev_employment_start, prev_employment_end,
                experience_letter_name,
                ssc_institution, ssc_year, ssc_certificate_name,
                inter_institution, inter_year, inter_certificate_name,
                degree, institution, graduation_year, degree_certificate_name,
                emergency_contact_name, emergency_contact_relationship, emergency_contact_phone, emergency_contact_address,
                job_role, job_start_date, department,
                profile_pic_name, id_proof_name, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
            [
                fullName, empId, email, phone, dob,
                streetAddress, city, state, zipCode,
                bankName, mobileNumber, accountNumber, ifscNumber,
                prevCompanyName || null, prevJobRole || null, prevEmploymentStart || null, prevEmploymentEnd || null,
                experienceLetterName,
                sscInstitution, sscYear, sscCertificateName,
                interInstitution, interYear, interCertificateName,
                degree, institution, graduationYear, degreeCertificateName,
                emergencyContactName, emergencyContactRelationship, emergencyContactPhone, emergencyContactAddress,
                jobRole, jobStartDate, department,
                profilePicName, idProofName
            ]
        );
        console.log(`Employee data inserted with ID: ${result.insertId}`);
        res.status(200).json({ message: 'Employee data submitted successfully', id: result.insertId });
    } catch (error) {
        console.error('Error submitting employee form:', error.message, error.stack);
        res.status(500).json({ error: 'Failed to submit employee data', details: error.message });
    }
});

app.get('/api/onboarding', async (req, res) => {
    try {
        console.log('Fetching onboarding records...');
        const [rows] = await pool.query(`
            SELECT id, full_name AS fullName, emp_id AS empId, email, department, job_role AS jobRole, job_start_date AS jobStartDate, status
            FROM employees
        `);
        console.log(`Fetched ${rows.length} onboarding records`);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching onboarding records:', error.message, error.stack);
        res.status(500).json({ error: 'Failed to fetch onboarding records', details: error.message });
    }
});

app.get('/api/onboarding/:id', async (req, res) => {
    const { id } = req.params;
    try {
        console.log(`Fetching onboarding record with ID: ${id}`);
        const [rows] = await pool.query(`
            SELECT
                id, full_name AS fullName, emp_id AS empId, email, phone, dob,
                street_address AS streetAddress, city, state, zip_code AS zipCode,
                bank_name AS bankName, mobile_number AS mobileNumber, account_number AS accountNumber, ifsc_number AS ifscNumber,
                prev_company_name AS prevCompanyName, prev_job_role AS prevJobRole, prev_employment_start AS prevEmploymentStart, prev_employment_end AS prevEmploymentEnd,
                experience_letter_name AS experienceLetterName,
                ssc_institution AS sscInstitution, ssc_year AS sscYear, ssc_certificate_name AS sscCertificateName,
                inter_institution AS interInstitution, inter_year AS interYear, inter_certificate_name AS interCertificateName,
                degree, institution, graduation_year AS graduationYear, degree_certificate_name AS degreeCertificateName,
                emergency_contact_name AS emergencyContactName, emergency_contact_relationship AS emergencyContactRelationship,
                emergency_contact_phone AS emergencyContactPhone, emergency_contact_address AS emergencyContactAddress,
                job_role AS jobRole, job_start_date AS jobStartDate, department, profile_pic_name AS profilePicName, id_proof_name AS idProofName,
                status
            FROM employees
            WHERE id = ?
        `, [id]);
        if (rows.length === 0) {
            console.log(`No record found with ID: ${id}`);
            return res.status(404).json({ error: 'Record not found' });
        }
        console.log(`Fetched record with ID: ${id}`);
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error fetching onboarding record:', error.message, error.stack);
        res.status(500).json({ error: 'Failed to fetch onboarding record', details: error.message });
    }
});

app.patch('/api/onboarding/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!['Pending', 'Active', 'Rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    try {
        console.log(`Updating status for ID: ${id} to ${status}`);
        const [result] = await pool.query(
            `UPDATE employees SET status = ? WHERE id = ?`,
            [status, id]
        );
        if (result.affectedRows === 0) {
            console.log(`No record found with ID: ${id}`);
            return res.status(404).json({ error: 'Record not found' });
        }
        console.log(`Status updated for ID: ${id}`);
        res.status(200).json({ message: 'Status updated successfully' });
    } catch (error) {
        console.error('Error updating status:', error.message, error.stack);
        res.status(500).json({ error: 'Failed to update status', details: error.message });
    }
});

app.get('/api/onboarding/:id/file/:field', async (req, res) => {
    const { id, field } = req.params;
    const validFields = ['profilePic', 'idProof', 'sscCertificate', 'interCertificate', 'degreeCertificate', 'experienceLetter'];
    if (!validFields.includes(field)) {
        return res.status(400).json({ error: 'Invalid file field' });
    }
    try {
        console.log(`Serving file for ID: ${id}, field: ${field}`);
        const [rows] = await pool.query(
            `SELECT ${field}_name AS fileName FROM employees WHERE id = ?`,
            [id]
        );
        if (rows.length === 0 || !rows[0].fileName) {
            console.log(`No file found for ID: ${id}, field: ${field}`);
            return res.status(404).json({ error: 'File not found' });
        }
        const filePath = path.join(uploadDir, rows[0].fileName);
        if (!fs.existsSync(filePath)) {
            console.log(`File not found on server: ${filePath}`);
            return res.status(404).json({ error: 'File not found on server' });
        }
        const mimeType = getMimeType(rows[0].fileName);
        res.setHeader('Content-Type', mimeType);
        res.download(filePath, rows[0].fileName);
    } catch (error) {
        console.error('Error serving file:', error.message, error.stack);
        res.status(500).json({ error: 'Failed to serve file', details: error.message });
    }
});

function getMimeType(fileName) {
    if (!fileName) return 'application/octet-stream';
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

app.post('/submit-offboarding', async (req, res) => {
    const {
        full_name, emp_id, position, department,
        feedback, final_salary, bonus, acknowledgment, status
    } = req.body;

    try {
        console.log('Inserting offboarding data:', { full_name, emp_id, department });
        const [result] = await pool.query(
            `INSERT INTO offboarding_records (
                full_name, emp_id, position, department,
                feedback, final_salary, bonus, acknowledgment, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                full_name, emp_id, position, department,
                feedback, final_salary, bonus, acknowledgment, status
            ]
        );
        console.log(`Offboarding data inserted with ID: ${result.insertId}`);
        res.status(200).json({ message: 'Offboarding data submitted successfully', id: result.insertId });
    } catch (error) {
        console.error('Error submitting offboarding form:', error.message, error.stack);
        res.status(500).json({ error: 'Failed to submit offboarding data', details: error.message });
    }
});

app.get('/offboarding-records', async (req, res) => {
    try {
        console.log('Fetching offboarding records...');
        const [rows] = await pool.query('SELECT * FROM offboarding_records');
        console.log(`Fetched ${rows.length} offboarding records`);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching offboarding records:', error.message, error.stack);
        res.status(500).json({ error: 'Failed to fetch offboarding records', details: error.message });
    }
});

app.use('/Uploads', express.static(uploadDir));

app.use((err, req, res, next) => {
    console.error('Server error:', err.message, err.stack);
    res.status(500).json({ error: 'Internal server error', details: err.message });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Serving static files from:', path.join(__dirname, 'public'));
});