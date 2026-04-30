import { createCoreApiApp } from './app.js';
import { startNotificationDeliveryWorker } from './notification-worker.js';
import { startPaymentReconciliationWorker } from './payment-reconciliation-worker.js';
import { createRepositoryFromEnv } from './repository-factory.js';

const port = Number.parseInt(process.env['PORT'] ?? '3000', 10);
const host = process.env['HOST'] ?? '0.0.0.0';

const repository = createRepositoryFromEnv();
const app = createCoreApiApp({ repository, routeGuardsEnabled: true });
const notificationDeliveryWorker = startNotificationDeliveryWorker({ repository });
const paymentReconciliationWorker = startPaymentReconciliationWorker({ repository });

app.addHook('onClose', () => {
  notificationDeliveryWorker?.stop();
  paymentReconciliationWorker?.stop();
});

await app.listen({ host, port });
