import { DocumentHead } from './document-head';
import { AppProviders } from './providers/app-providers';
import { AppRoutes } from './routing/app-routes';

export const App = () => (
  <AppProviders>
    <DocumentHead />
    <AppRoutes />
  </AppProviders>
);
