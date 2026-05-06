import { readFile } from 'node:fs/promises';

const appPath = new URL('../packages/core-api/src/app.ts', import.meta.url);
const contractPath = new URL('../docs/api/core-api.openapi.json', import.meta.url);
const appSource = await readFile(appPath, 'utf8');
const contract = JSON.parse(await readFile(contractPath, 'utf8'));

if (contract.openapi !== '3.1.0') {
  throw new Error('OpenAPI contract must use openapi: 3.1.0.');
}

if (typeof contract.info?.title !== 'string' || typeof contract.info?.version !== 'string') {
  throw new Error('OpenAPI contract must define info.title and info.version.');
}

const fastifyRoutes = new Set(readFastifyRoutes(appSource).map(routeKey));

for (const [method, path] of readFastifyRoutes(appSource)) {
  if (contract.paths?.[path]?.[method] === undefined) {
    throw new Error(`OpenAPI contract is missing ${method.toUpperCase()} ${path}.`);
  }
}

const operationIds = new Set();
const liveDataOperationIds = new Set([
  'checkInVisit',
  'checkOutVisit',
  'cancelCurrentSubscriberSubscription',
  'changeCurrentSubscriberSubscriptionTier',
  'createCurrentSubscriberSubscription',
  'createWorkerUnavailability',
  'getCurrentSubscriberSubscription',
  'getOperatorBetaMetrics',
  'getSubscriptionDetail',
  'getWorkerEarnings',
  'getWorkerProfile',
  'getWorkerRoute',
  'listCurrentSubscriberSubscriptionBillingHistory',
  'listLomePricing',
  'listOperatorDisputes',
  'listOperatorMatchingQueue',
  'listOperatorNotifications',
  'listOperatorPaymentAttempts',
  'listOperatorServiceCells',
  'listSubscriptionBillingHistory',
  'pauseCurrentSubscriberSubscription',
  'recordVisitPhoto',
  'refreshAuthSession',
  'requestCurrentSubscriberFirstVisit',
  'resumeCurrentSubscriberSubscription',
  'reportWorkerIssue',
  'startOtpChallenge',
  'updateCurrentSubscriberPaymentMethod',
  'verifyOtpChallenge',
]);

for (const [path, methods] of Object.entries(contract.paths ?? {})) {
  for (const [method, operation] of Object.entries(methods)) {
    if (!fastifyRoutes.has(routeKey([method, path]))) {
      throw new Error(
        `OpenAPI contract has no matching Fastify route for ${method.toUpperCase()} ${path}.`,
      );
    }

    if (typeof operation.operationId !== 'string' || operation.operationId.length === 0) {
      throw new Error(`${method.toUpperCase()} ${path} is missing operationId.`);
    }

    if (operationIds.has(operation.operationId)) {
      throw new Error(`Duplicate operationId: ${operation.operationId}.`);
    }

    operationIds.add(operation.operationId);

    if (liveDataOperationIds.has(operation.operationId)) {
      assertLiveDataOperationIsTyped(method, path, operation);
    }
  }
}

for (const operationId of liveDataOperationIds) {
  if (!operationIds.has(operationId)) {
    throw new Error(`Live-data OpenAPI contract is missing ${operationId}.`);
  }
}

process.stdout.write(`core-api openapi contract ok (${operationIds.size} operations)\n`);

function readFastifyRoutes(source) {
  const routePattern = /app\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)/g;
  const routes = [];
  let match;

  while ((match = routePattern.exec(source)) !== null) {
    routes.push([match[1], normalizeFastifyPath(match[2])]);
  }

  return routes;
}

function normalizeFastifyPath(path) {
  if (path.endsWith('/*')) {
    return `${path.slice(0, -2)}/{objectKey}`;
  }

  return path.replace(/:([A-Za-z][A-Za-z0-9_]*)/g, '{$1}');
}

function routeKey([method, path]) {
  return `${method.toLowerCase()} ${path}`;
}

function assertLiveDataOperationIsTyped(method, path, operation) {
  const location = `${method.toUpperCase()} ${path}`;

  if (operation.requestBody !== undefined) {
    const requestSchema = operation.requestBody.content?.['application/json']?.schema;

    if (isGenericObjectSchema(requestSchema)) {
      throw new Error(`${location} uses a generic live-data request schema.`);
    }
  }

  const successResponses = Object.entries(operation.responses ?? {}).filter(([status]) =>
    /^2\d\d$/u.test(status),
  );

  if (successResponses.length === 0) {
    throw new Error(`${location} is missing a 2xx response.`);
  }

  for (const [status, response] of successResponses) {
    const responseSchema = response.content?.['application/json']?.schema;

    if (responseSchema === undefined) {
      throw new Error(`${location} ${status} response is missing an application/json schema.`);
    }

    if (isGenericObjectSchema(responseSchema)) {
      throw new Error(`${location} ${status} uses a generic live-data response schema.`);
    }
  }
}

function isGenericObjectSchema(schema) {
  if (schema === undefined || schema.$ref !== undefined) {
    return false;
  }

  return (
    schema.type === 'object' &&
    schema.additionalProperties === true &&
    Object.keys(schema.properties ?? {}).length === 0 &&
    schema.oneOf === undefined &&
    schema.anyOf === undefined &&
    schema.allOf === undefined
  );
}
