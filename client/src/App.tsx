import PublicWorkspace from "./components/PublicWorkspace";
import QuoteRequestsInbox from "./pages/QuoteRequestsInbox";
import { useAuth } from "@/_core/hooks/useAuth";
import { PublicOperations, PublicOperation, MyAccount } from "./pages/PublicPortal";
import PublicChat from "./pages/PublicChat";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";

// Auth Pages — login é eager (primeira pintura); o resto entra sob demanda.
import Login from "./pages/Login";
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const LandingExcambia = lazy(() => import("./pages/LandingExcambia"));

// Dashboard Pages — code-splitting por rota: cada página vira um chunk próprio,
// e o renderizador pesado (markdown/shiki/mermaid/katex) só baixa onde é usado.
const NotFound = lazy(() => import("@/pages/NotFound"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Calculate = lazy(() => import("./pages/Calculate"));
const CalculateMultiple = lazy(() => import("./pages/CalculateMultiple"));
const Calculations = lazy(() => import("./pages/Calculations"));
const Quotations = lazy(() => import("./pages/Quotations"));
const QuotationDetail = lazy(() => import("./pages/QuotationDetail"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const Products = lazy(() => import("./pages/Products"));
const Settings = lazy(() => import("./pages/Settings"));

const ExcambiaChat = lazy(() => import("./pages/ExcambiaChat"));
const ReformDashboard = lazy(() => import("./pages/ReformDashboard"));
const RfqDashboard = lazy(() => import("./pages/RfqDashboard"));
const RfqCreate = lazy(() => import("./pages/RfqCreate"));
const RfqDetail = lazy(() => import("./pages/RfqDetail"));
const IndustryDetail = lazy(() => import("./pages/IndustryDetail"));
const Messaging = lazy(() => import("./pages/Messaging"));
const Operacoes = lazy(() => import("./pages/Operacoes"));
const OperacaoDetail = lazy(() => import("./pages/OperacaoDetail"));
const Proformas = lazy(() => import("./pages/Proformas"));
const Parametros = lazy(() => import("./pages/Parametros"));
const MemoriaExcambia = lazy(() => import("./pages/MemoriaExcambia"));
const Diagnostics = lazy(() => import("./pages/Diagnostics"));

/** Fallback discreto enquanto o chunk da página carrega. */
function RouteFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
    </div>
  );
}

/**
 * RootGateway — Em `/`:
 * - Visitantes não autenticados veem a landing page pública (`LandingExcambia`).
 * - Usuários autenticados (públicos ou internos) seguem direto para `AuthenticatedRoutes`.
 */
function RootGateway() {
  const { user, loading } = useAuth();
  if (loading) return <RouteFallback />;
  if (!user) return <LandingExcambia />;
  return <AuthenticatedRoutes />;
}

function AuthenticatedRoutes() {
  const {user,loading}=useAuth();
  if(loading)return <RouteFallback/>;
  if(user?.role==='public')return <PublicWorkspace><Switch>
    <Route path="/" component={PublicChat}/><Route path="/excambia" component={PublicChat}/>
    <Route path="/operacoes" component={PublicOperations}/><Route path="/operacao/:id" component={PublicOperation}/>
    <Route path="/minha-conta" component={MyAccount}/><Route component={NotFound}/>
  </Switch></PublicWorkspace>;
  return (
    <DashboardLayout>
      <Suspense fallback={<RouteFallback />}>
      <Switch>
        {/* Excambia é a porta de entrada (cérebro do sistema) */}
        <Route path="/" component={ExcambiaChat} />
        <Route path="/calculate" component={CalculateMultiple} />
        <Route path="/calculate-single" component={Calculate} />
        <Route path="/calculations" component={Calculations} />
        <Route path="/calculations/:id" component={QuotationDetail} />
        <Route path="/quotations" component={Quotations} />
        <Route path="/quotations/:id" component={QuotationDetail} />
        <Route path="/suppliers" component={Marketplace} />
        <Route path="/products" component={Products} />
        <Route path="/settings" component={Settings} />
        <Route path="/minha-conta" component={MyAccount} />
        <Route path="/excambia" component={ExcambiaChat} />
        <Route path="/industries" component={Marketplace} />
        <Route path="/industries/:id">{(params: any) => <IndustryDetail id={params.id} />}</Route>
        <Route path="/rfq" component={RfqDashboard} />
        <Route path="/rfq/new" component={RfqCreate} />
        <Route path="/rfq/:id" component={RfqDetail} />
        <Route path="/messaging" component={Messaging} />
        <Route path="/operacoes" component={Operacoes} />
        <Route path="/operacao/:id" component={OperacaoDetail} />
        <Route path="/solicitacoes">{() => user?.role === "admin" ? <QuoteRequestsInbox/> : <NotFound/>}</Route>
        <Route path="/proformas" component={Proformas} />
        <Route path="/parametros" component={Parametros} />
        <Route path="/memoria" component={MemoriaExcambia} />
        <Route path="/reform" component={ReformDashboard} />
        <Route path="/diagnostics" component={Diagnostics} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
      </Suspense>
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Suspense fallback={<RouteFallback />}>
    <Switch>
      {/* Public presentation & auth routes */}
      <Route path="/apresentacao" component={LandingExcambia} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/" component={RootGateway} />

      {/* Protected routes - DashboardLayout handles auth */}
      <Route>
        <AuthenticatedRoutes />
      </Route>
    </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
