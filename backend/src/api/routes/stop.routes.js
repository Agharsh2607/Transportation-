const { Router } = require('express');
const stopController = require('../controllers/stop.controller');

const router = Router();

// GET /stops/nearby?lat=&lng=&radius=  — must come before /:id
router.get('/stops/nearby', stopController.getNearby);

// GET /stops
router.get('/stops', stopController.getAll);

// GET /stops/:id
router.get('/stops/:id', stopController.getById);

module.exports = router;
