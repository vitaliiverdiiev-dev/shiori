import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router';
import { authPaths, AuthRoute } from '@/domain/auth';
import { HealthStatus } from '@/domain/health';
import { AccountSettingsPage } from '@/pages/account-settings';
import { HomePage } from '@/pages/home';
import { NotFoundPage } from '@/pages/not-found';
import { SecuritySettingsPage } from '@/pages/security-settings';
import { SignInPage } from '@/pages/sign-in';
import { SignUpPage } from '@/pages/sign-up';
import { StatusPage } from '@/pages/status';
import product from '@/product-config';
import { AppLayout } from './layouts/app-layout';
import { GuestLayout } from './layouts/guest-layout';
import { queryClient } from './providers/query-client';

export const App = () => {
  const faviconHref = `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-size="52" font-family="serif">${product.logoGlyph}</text></svg>`,
  )}`;

  return (
    <>
      <title>{`${product.name} — ${product.tagline}`}</title>
      <link href={faviconHref} rel="icon" />
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route
              element={
                <AuthRoute
                  access="protected"
                  unavailableDetails={<HealthStatus />}
                />
              }
            >
              <Route
                element={
                  <AppLayout
                    logoGlyph={product.logoGlyph}
                    name={product.name}
                  />
                }
              >
                <Route
                  element={
                    <HomePage
                      logoGlyph={product.logoGlyph}
                      name={product.name}
                      nameJa={product.nameJa}
                      tagline={product.tagline}
                    />
                  }
                  index
                />
                <Route element={<StatusPage />} path="status" />
                <Route
                  element={<AccountSettingsPage />}
                  path="settings/account"
                />
                <Route
                  element={<SecuritySettingsPage />}
                  path="settings/security"
                />
              </Route>
            </Route>
            <Route
              element={
                <AuthRoute
                  access="guest"
                  unavailableDetails={<HealthStatus />}
                />
              }
            >
              <Route
                element={
                  <GuestLayout
                    logoGlyph={product.logoGlyph}
                    name={product.name}
                  />
                }
              >
                <Route element={<SignInPage />} path={authPaths.signIn} />
                <Route element={<SignUpPage />} path={authPaths.signUp} />
              </Route>
            </Route>
            <Route element={<NotFoundPage />} path="*" />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </>
  );
};
