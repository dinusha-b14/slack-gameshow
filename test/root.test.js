'use strict';

const request = require('supertest');
const { expect } = require('chai');
const app = require('../src/app');

describe('GET /', () => {
    it('returns 200 OK', async () => {
        const response = await request(app).get('/')
        expect(response.statusCode).to.equal(200);
        expect(response.header['content-type']).to.equal('text/html; charset=utf-8');
        expect(response.text).to.equal('Welcome to Gameshow!');
    });
});
