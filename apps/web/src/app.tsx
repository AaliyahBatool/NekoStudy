import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';

import { copy } from './copy';
import { HomePage } from './pages/HomePage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function NotFoundPage() {
  return (
    <main className="not-found">
      <p className="eyebrow">{copy.brand.name}</p>
      <h1>{copy.notFound.title}</h1>
      <Link className="home-link" to="/">
        {copy.notFound.home}
      </Link>
    </main>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
