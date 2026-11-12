// Manual Jest mock for the database module.
// query() is a shared mock; connect() returns a client whose query is the SAME
// mock, so a test can set up one mockResolvedValueOnce chain that covers both
// pooled queries and transaction (client) queries.
const query = jest.fn();

const connect = jest.fn().mockResolvedValue({
    query,
    release: jest.fn(),
});

module.exports = { query, connect };
