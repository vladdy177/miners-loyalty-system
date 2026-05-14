const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'The Miners Coffee — Loyalty System API',
            version: '1.0.0',
            description:
                'REST API for the loyalty programme of The Miners Coffee chain. ' +
                'Handles customer registration, tier progression, voucher management, ' +
                'Google Wallet integration and admin operations.',
        },
        servers: [
            { url: 'http://localhost:5000', description: 'Local development' },
            { url: 'https://miners-loyalty-system-1.onrender.com', description: 'Production (Render)' },
        ],
        // JWT bearer token — admin endpoints require this
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Obtain a token via POST /api/admin/login and paste it here.',
                },
            },
            schemas: {
                // --- reusable response shapes ---
                Error: {
                    type: 'object',
                    properties: {
                        error: { type: 'string', example: 'Something went wrong' },
                    },
                },
                Branch: {
                    type: 'object',
                    properties: {
                        id:      { type: 'string', format: 'uuid' },
                        name:    { type: 'string', example: 'The Miners Letná' },
                        city:    { type: 'string', example: 'Prague' },
                        country: { type: 'string', example: 'Czech Republic' },
                    },
                },
                UserProfile: {
                    type: 'object',
                    properties: {
                        first_name:     { type: 'string', example: 'Jan' },
                        last_name:      { type: 'string', example: 'Novák' },
                        points_balance: { type: 'integer', example: 4200 },
                        tier:           { type: 'string', enum: ['STANDARD', 'SILVER', 'GOLD', 'CREW'] },
                        qr_code_token:  { type: 'string', example: 'MINERS-A1B2C3D4E5F6' },
                        home_branch:    { type: 'string', example: 'The Miners Letná' },
                    },
                },
                VoucherTemplate: {
                    type: 'object',
                    properties: {
                        id:                  { type: 'string', format: 'uuid' },
                        title:               { type: 'string', example: 'FREE COFFEE' },
                        description:         { type: 'string', example: 'One free espresso of your choice.' },
                        cost:                { type: 'integer', example: 850 },
                        discount_type:       { type: 'string', enum: ['free_product', 'percentage'] },
                        discount_value:      { type: 'number', example: 0 },
                        image_url:           { type: 'string', example: 'https://example.com/coffee.jpg' },
                        is_crew_only:        { type: 'boolean', example: false },
                        valid_duration_days: { type: 'integer', example: 30 },
                    },
                },
                UserVoucher: {
                    type: 'object',
                    properties: {
                        id:          { type: 'string', format: 'uuid' },
                        title:       { type: 'string', example: 'FREE COFFEE' },
                        description: { type: 'string' },
                        image_url:   { type: 'string' },
                        status:      { type: 'string', enum: ['active', 'used'] },
                        expires_at:  { type: 'string', format: 'date-time' },
                        redeemed_at: { type: 'string', format: 'date-time', nullable: true },
                    },
                },
            },
        },
    },
    // swagger-jsdoc scans these files for @swagger comments
    apis: ['./routes/*.js'],
};

module.exports = swaggerJsdoc(options);
