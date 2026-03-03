const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

const ToDo = sequelize.define('ToDo', {
    IdToDo: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    KodePeternakan: { type: DataTypes.INTEGER, allowNull: false },
    Judul: { type: DataTypes.STRING(255), allowNull: false },
    Deskripsi: { type: DataTypes.TEXT },
    IsCompleted: { type: DataTypes.BOOLEAN, defaultValue: false },
    Prioritas: { type: DataTypes.ENUM('Low', 'Medium', 'High'), defaultValue: 'Medium' },
    TenggatWaktu: { type: DataTypes.DATEONLY }
});

module.exports = ToDo;
