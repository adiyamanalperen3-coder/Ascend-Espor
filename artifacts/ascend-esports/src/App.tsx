import { useEffect, useRef, type ReactNode } from 'react';
import { ClerkProvider, SignIn, SignUp, useClerk } from '@clerk/react';
import { trTR } from '@clerk/localizations';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import Admin from '@/pages/admin';
import Home from '@/pages/home';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function stripBase(path: string) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#22e0d0',
    colorForeground: '#eefafa',
    colorMutedForeground: '#91aaa9',
    colorDanger: '#f27b75',
    colorBackground: '#0d1b1e',
    colorInput: '#071315',
    colorInputForeground: '#eefafa',
    colorNeutral: '#1d393b',
    fontFamily: "'DM Sans', sans-serif",
    borderRadius: '0.65rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#0d1b1e] border border-[#1d393b] rounded-2xl w-[440px] max-w-full overflow-hidden',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#eefafa] font-bold',
    headerSubtitle: 'text-[#91aaa9]',
    socialButtonsBlockButtonText: 'text-[#eefafa]',
    formFieldLabel: 'text-[#c2d8d7]',
    footerActionLink: 'text-[#22e0d0]',
    footerActionText: 'text-[#91aaa9]',
    dividerText: 'text-[#91aaa9]',
    identityPreviewEditButton: 'text-[#22e0d0]',
    formFieldSuccessText: 'text-[#22e0d0]',
    alertText: 'text-[#eefafa]',
    logoBox: 'rounded-lg',
    logoImage: 'h-10 w-10',
    socialButtonsBlockButton: 'border border-[#1d393b] bg-[#102427]',
    formButtonPrimary: 'bg-[#22e0d0] text-[#031313] font-bold',
    formFieldInput: 'bg-[#071315] text-[#eefafa] border-[#1d393b]',
    footerAction: 'border-t border-[#1d393b]',
    dividerLine: 'bg-[#1d393b]',
    alert: 'bg-[#251516] border border-[#6e3032]',
    otpCodeFieldInput: 'bg-[#071315] text-[#eefafa] border-[#1d393b]',
    formFieldRow: 'text-[#eefafa]',
    main: 'text-[#eefafa]',
  },
};

function CacheInvalidator() {
  const { addListener } = useClerk();
  const client = useQueryClient();
  const previousUser = useRef<string | null | undefined>(undefined);
  useEffect(() => addListener(({ user }) => {
    const currentUser = user?.id ?? null;
    if (previousUser.current !== undefined && previousUser.current !== currentUser) client.clear();
    previousUser.current = currentUser;
  }), [addListener, client]);
  return null;
}

function SignInPage() {
  return <div className="auth-shell"><div className="auth-inner">
    <a className="brand" href="/"><span className="mark">A</span><span>ASCEND<small>STANDOFF 2 ESPORTS</small></span></a>
    <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
  </div></div>;
}
function SignUpPage() {
  return <div className="auth-shell"><div className="auth-inner">
    <a className="brand" href="/"><span className="mark">A</span><span>ASCEND<small>STANDOFF 2 ESPORTS</small></span></a>
    <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
  </div></div>;
}
function RoutedBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}
function RoutedApp() {
  const [, setLocation] = useLocation();
  return <ClerkProvider
    publishableKey={clerkPubKey}
    proxyUrl={clerkProxyUrl}
    appearance={clerkAppearance}
    signInUrl={`${basePath}/sign-in`}
    signUpUrl={`${basePath}/sign-up`}
    localization={{
      ...trTR,
      signIn: {
        ...trTR.signIn,
        start: {
          ...trTR.signIn?.start,
          title: 'Tekrar hoş geldin',
          subtitle: 'ASCEND yönetim paneline giriş yap',
        },
      },
      signUp: {
        ...trTR.signUp,
        start: {
          ...trTR.signUp?.start,
          title: 'Hesap oluştur',
          subtitle: 'ASCEND Esports için hesabını oluştur',
        },
      },
    }}
    routerPush={to => setLocation(stripBase(to))}
    routerReplace={to => setLocation(stripBase(to), { replace: true })}
  >
    <QueryClientProvider client={queryClient}>
      <CacheInvalidator />
      <TooltipProvider>
        <RoutedBoundary>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/admin" component={Admin} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route component={NotFound} />
          </Switch>
        </RoutedBoundary>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  </ClerkProvider>;
}

function App() {
  if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY');
  return <WouterRouter base={basePath}><RoutedApp /></WouterRouter>;
}
export default App;
