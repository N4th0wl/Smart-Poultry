require('dotenv').config();
const { Sequelize } = require('sequelize');

async function testFetch() {
    console.log("Connecting to Processor DB:", process.env.PROCESSOR_DB_NAME, "at", process.env.PROCESSOR_DB_HOST);
    
    // Simulate getProcessorConnection()
    const procConn = new Sequelize(
        process.env.PROCESSOR_DB_NAME || 'smartpoultry_processor',
        process.env.PROCESSOR_DB_USER || 'root',
        process.env.PROCESSOR_DB_PASSWORD || '',
        {
            host: process.env.PROCESSOR_DB_HOST || 'localhost',
            port: process.env.PROCESSOR_DB_PORT || 3306,
            dialect: 'mysql',
            timezone: '+07:00',
            logging: console.log, // Enable logging to see actual SQL
            pool: { max: 3, min: 0, acquire: 15000, idle: 10000 },
            define: { timestamps: false, freezeTableName: true }
        }
    );

    try {
        await procConn.authenticate();
        console.log("Connected to Processor DB successfully.");
        
        const kodePeternakan = '1'; // or 1 as number
        console.log('kodePeternakan param:', kodePeternakan);

        const query = `SELECT o.IdOrder, o.KodeOrder, o.KodePeternakan, o.NamaPeternakan, o.AlamatPeternakan,
                    o.KontakPeternakan, o.JenisAyam, o.JumlahPesanan, o.Satuan,
                    o.TanggalOrder, o.TanggalDibutuhkan, o.HargaSatuan, o.TotalHarga,
                    o.StatusOrder, o.Catatan, o.CreatedAt,
                    p.NamaProcessor
             FROM orders o
             LEFT JOIN processor p ON o.IdProcessor = p.IdProcessor
             WHERE o.KodePeternakan = :kodePeternakan
             ORDER BY o.CreatedAt DESC`;
             
        const orders = await procConn.query(query, { type: Sequelize.QueryTypes.SELECT, replacements: { kodePeternakan: String(kodePeternakan) } });
        console.log('Orders found:', orders.length);
        console.log(orders);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await procConn.close();
    }
}
testFetch();
