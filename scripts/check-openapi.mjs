import { readFile } from 'node:fs/promises';

const contractPath = new URL('../docs/api/core-api.openapi.json', import.meta.url);
const contract = JSON.parse(await readFile(contractPath, 'utf8'));

if (contract.openapi !== '3.1.0') {
  throw new Error('OpenAPI contract must use openapi: 3.1.0.');
}

if (typeof contract.info?.title !== 'string' || typeof contract.info?.version !== 'string') {
  throw new Error('OpenAPI contract must define info.title and info.version.');
}

const requiredRoutes = [
  ['get', '/health'],
  ['get', '/ready'],
  ['post', '/v1/auth/otp/start'],
  ['post', '/v1/auth/otp/verify'],
  ['post', '/v1/subscriptions'],
  ['get', '/v1/subscriptions/{subscriptionId}'],
  ['post', '/v1/subscriptions/{subscriptionId}/assignment'],
  ['get', '/v1/operator/beta-metrics'],
  ['post', '/v1/visits/{visitId}/photo-uploads'],
  ['post', '/v1/visits/{visitId}/photos'],
];

for (const [method, path] of requiredRoutes) {
  if (contract.paths?.[path]?.[method] === undefined) {
    throw new Error(`OpenAPI contract is missing ${method.toUpperCase()} ${path}.`);
  }
}

const operationIds = new Set();

for (const [path, methods] of Object.entries(contract.paths ?? {})) {
  for (const [method, operation] of Object.entries(methods)) {
    if (typeof operation.operationId !== 'string' || operation.operationId.length === 0) {
      throw new Error(`${method.toUpperCase()} ${path} is missing operationId.`);
    }

    if (operationIds.has(operation.operationId)) {
      throw new Error(`Duplicate operationId: ${operation.operationId}.`);
    }

    operationIds.add(operation.operationId);
  }
}

process.stdout.write(`core-api openapi contract ok (${operationIds.size} operations)\n`);
