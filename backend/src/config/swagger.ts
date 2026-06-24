import swaggerJsdoc from 'swagger-jsdoc';
import { env } from '../config/env';
import path from 'path';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Tuition Case Marketplace API',
      version: '1.0.0',
      description:
        'REST API for a tuition marketplace where parents post cases and invite tutors. ' +
        'All sensitive resources enforce server-side authorization.',
    },
    servers: [{ url: `http://localhost:${env.PORT}`, description: 'Local' }],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'session',
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['PARENT', 'TUTOR'] },
          },
        },
        Case: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            subject: { type: 'string' },
            level: { type: 'string' },
            location: { type: 'string', nullable: true },
            budgetPerHour: { type: 'number' },
            status: { type: 'string', enum: ['OPEN', 'MATCHED', 'CLOSED'] },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                code: { type: 'string' },
              },
            },
          },
        },
      },
    },
    security: [{ cookieAuth: [] }, { bearerAuth: [] }],
  },
  // resolve route files relative to this file so swagger-jsdoc finds them
  // include both TS and JS outputs so docs load in dev and after build
  apis: [path.resolve(__dirname, '../routes/*.ts'), path.resolve(__dirname, '../routes/*.js')],
};

export const swaggerSpec = swaggerJsdoc(options);
