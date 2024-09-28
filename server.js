// Import libraries
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config(); // Load environment variables from .env file

// Initialize app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allow cross-origin requests
app.use(express.json()); // Parse incoming JSON requests
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve static files from uploads folder

// MongoDB connection using environment variables
mongoose.connect(process.env.MONGODB_URI, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Ensure 'uploads' folder exists
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Unique file name with timestamp
    }
});

const upload = multer({ storage });

// Task schema and model
const taskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    dueDate: { type: Date, required: true },
    submissionDate: { type: Date },
    image: { type: String },
    completed: { type: Boolean, default: false },
});

const Task = mongoose.model('Task', taskSchema);

// API Routes
app.get('/tasks', async (req, res) => {
    try {
        const tasks = await Task.find();
        res.json(tasks);
    } catch (err) {
        console.error('Error fetching tasks:', err);
        res.status(500).json({ message: 'Error fetching tasks' });
    }
});

app.post('/tasks', upload.single('image'), async (req, res) => {
    const { title, subject, description, dueDate } = req.body;

    // Validate required fields
    if (!title || !subject || !description || !dueDate) {
        return res.status(400).json({ message: 'Title, subject, description, and due date are required.' });
    }

    // Create new task
    const newTask = new Task({
        title,
        subject,
        description,
        dueDate: new Date(dueDate),
        submissionDate: req.body.submissionDate ? new Date(req.body.submissionDate) : undefined,
        image: req.file ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` : null
    });

    try {
        const savedTask = await newTask.save();
        res.status(201).json(savedTask);
    } catch (err) {
        console.error('Error saving task:', err);
        res.status(400).json({ message: 'Error saving task', error: err.message });
    }
});

app.put('/tasks/:id', upload.single('image'), async (req, res) => {
    const { id } = req.params;

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid ID format' });
    }

    const updateData = {
        title: req.body.title,
        subject: req.body.subject,
        description: req.body.description,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
        submissionDate: req.body.submissionDate ? new Date(req.body.submissionDate) : undefined,
        image: req.file ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` : undefined
    };

    try {
        const updatedTask = await Task.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
        if (!updatedTask) return res.status(404).json({ message: 'Task not found' });
        res.json(updatedTask);
    } catch (err) {
        console.error('Error updating task:', err);
        res.status(400).json({ message: 'Error updating task' });
    }
});

app.delete('/tasks/:id', async (req, res) => {
    const { id } = req.params;

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid ID format' });
    }

    try {
        const deletedTask = await Task.findByIdAndDelete(id);
        if (!deletedTask) return res.status(404).json({ message: 'Task not found' });
        res.status(204).send(); // No content status for successful delete
    } catch (err) {
        console.error('Error deleting task:', err);
        res.status(500).json({ message: 'Error deleting task' });
    }
});

app.put('/tasks/:id/complete', async (req, res) => {
    const { id } = req.params;

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid ID format' });
    }

    try {
        const task = await Task.findByIdAndUpdate(id, { completed: req.body.completed }, { new: true });
        if (!task) return res.status(404).json({ message: 'Task not found' });
        res.json(task);
    } catch (err) {
        console.error('Error marking task as complete:', err);
        res.status(400).json({ message: 'Error marking task as complete' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
