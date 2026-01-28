
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');



router.post('/', userController.createUser);
router.get('/', userController.listUsers);

module.exports = router;
