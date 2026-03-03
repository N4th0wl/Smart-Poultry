const express = require('express');
const router = express.Router();
const { ToDo } = require('../models');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/todos - Get all todos
router.get('/', async (req, res) => {
    try {
        const todos = await ToDo.findAll({
            where: { KodePeternakan: req.user.kodePeternakan },
            order: [['isCompleted', 'ASC'], ['Prioritas', 'DESC'], ['TenggatWaktu', 'ASC']]
        });
        res.json(todos);
    } catch (error) {
        console.error('Get todos error:', error);
        res.status(500).json({ error: 'Failed to get todos' });
    }
});

// POST /api/todos - Create todo
router.post('/', async (req, res) => {
    try {
        const { judul, deskripsi, prioritas, tenggatWaktu } = req.body;

        const todo = await ToDo.create({
            KodePeternakan: req.user.kodePeternakan,
            Judul: judul,
            Deskripsi: deskripsi,
            Prioritas: prioritas || 'Medium',
            TenggatWaktu: tenggatWaktu
        });

        res.status(201).json(todo);
    } catch (error) {
        console.error('Create todo error:', error);
        res.status(500).json({ error: 'Failed to create todo' });
    }
});

// PUT /api/todos/:id - Update todo
router.put('/:id', async (req, res) => {
    try {
        const { isCompleted, judul, deskripsi, prioritas, tenggatWaktu } = req.body;
        const todo = await ToDo.findOne({
            where: { IdToDo: req.params.id, KodePeternakan: req.user.kodePeternakan }
        });

        if (!todo) {
            return res.status(404).json({ error: 'ToDo not found' });
        }

        await todo.update({
            IsCompleted: isCompleted !== undefined ? isCompleted : todo.IsCompleted,
            Judul: judul || todo.Judul,
            Deskripsi: deskripsi || todo.Deskripsi,
            Prioritas: prioritas || todo.Prioritas,
            TenggatWaktu: tenggatWaktu || todo.TenggatWaktu
        });

        res.json(todo);
    } catch (error) {
        console.error('Update todo error:', error);
        res.status(500).json({ error: 'Failed to update todo' });
    }
});

// DELETE /api/todos/:id
router.delete('/:id', async (req, res) => {
    try {
        const todo = await ToDo.findOne({
            where: { IdToDo: req.params.id, KodePeternakan: req.user.kodePeternakan }
        });

        if (!todo) {
            return res.status(404).json({ error: 'ToDo not found' });
        }

        await todo.destroy();
        res.json({ message: 'ToDo deleted' });
    } catch (error) {
        console.error('Delete todo error:', error);
        res.status(500).json({ error: 'Failed to delete todo' });
    }
});

module.exports = router;
