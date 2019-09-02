'use strict';

const request = require('supertest');
const app = require('../src/app');

test('Loads the root url correctly', async () => {
    const response = await request(app).get('/')
    expect(response.statusCode).toBe(200);
    expect(response.header['content-type']).toEqual('text/html; charset=utf-8');
    expect(response.text).toEqual('Welcome to Gameshow!');
});
