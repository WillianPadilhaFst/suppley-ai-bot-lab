/**
 * RequestAccessModal — Solicitação de acesso corporativo à Excambia (SUPPLEY)
 *
 * Conectado ao endpoint público `trpc.auth.requestAccess`:
 * - Sincroniza `defaultNote` (ex: dados vindos do Simulador ao Vivo) sempre que o modal abre.
 * - Envia a solicitação diretamente à equipe SUPPLEY via backend (`emailService`) quando
 *   configurado, e sempre oferece cópia / envio direto por e-mail como garantia adicional.
 */
import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Copy,
  Loader2,
  Mail,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { EASE_EDITORIAL, SPRING_SNAPPY } from "@/lib/motion";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export interface RequestAccessModalProps {
  open: boolean;
  onClose: () => void;
  defaultNote?: string;
}

export function RequestAccessModal({
  open,
  onClose,
  defaultNote = "",
}: RequestAccessModalProps) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [demanda, setDemanda] = useState(defaultNote);
  const [submitted, setSubmitted] = useState(false);
  const [deliveredByServer, setDeliveredByServer] = useState(false);

  // Sync simulation/context note whenever the modal opens with a new defaultNote
  useEffect(() => {
    if (open && defaultNote) {
      setDemanda(defaultNote);
    }
  }, [open, defaultNote]);

  const requestAccessMutation = trpc.auth.requestAccess.useMutation({
    onSuccess: (res) => {
      setDeliveredByServer(Boolean(res.emailSent));
      setSubmitted(true);
      toast.success(
        res.emailSent
          ? "Solicitação enviada para a equipe SUPPLEY!"
          : "Solicitação registrada! Você também pode enviar por e-mail ou copiar a ficha."
      );
    },
    onError: () => {
      // Fallback gracefully so prospect never loses their filled form
      setDeliveredByServer(false);
      setSubmitted(true);
      toast.info(
        "Ficha preparada! Envie por e-mail ou copie os dados para a equipe SUPPLEY."
      );
    },
  });

  const formattedMessage = [
    "Olá, equipe SUPPLEY!",
    "Gostaria de solicitar acesso à Excambia para realizar cotações de importação.",
    "",
    `• Nome: ${name || "—"}`,
    `• Empresa: ${company || "—"}`,
    `• E-mail corporativo: ${email || "—"}`,
    `• WhatsApp / Telefone: ${phone || "—"}`,
    demanda ? `• Produto / simulação de interesse: ${demanda}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !company.trim() || !email.trim()) {
      toast.error("Preencha nome, empresa e e-mail corporativo.");
      return;
    }
    requestAccessMutation.mutate({
      name: name.trim(),
      company: company.trim(),
      email: email.trim(),
      phone: phone.trim(),
      demanda: demanda.trim(),
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedMessage);
      toast.success("Dados da solicitação copiados!");
    } catch {
      toast.error("Não foi possível copiar automaticamente.");
    }
  };

  const handleMailto = () => {
    const subject = encodeURIComponent(
      `[SUPPLEY / Excambia] Solicitação de Acesso — ${company}`
    );
    const body = encodeURIComponent(formattedMessage);
    window.location.href = `mailto:contato@suppley.com.br?subject=${subject}&body=${body}`;
  };

  const handleResetAndClose = () => {
    setSubmitted(false);
    setDeliveredByServer(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="request-access-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={handleResetAndClose}
            className="fixed inset-0 bg-[#080512]/70 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.34, ease: EASE_EDITORIAL }}
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-white/15 bg-white text-[#1B1523] shadow-2xl"
          >
            <div
              className="h-1.5 w-full"
              style={{
                background: "linear-gradient(90deg, #682ABA 0%, #28E7C5 100%)",
              }}
            />

            <div className="p-6 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#682ABA]">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#14B89A]" />
                    <span>Liberação de acesso corporativo</span>
                  </div>
                  <h2
                    id="request-access-title"
                    className="text-xl font-bold tracking-tight text-[#1B1523]"
                  >
                    Solicitar login na Excambia
                  </h2>
                  <p className="text-xs leading-relaxed text-[#6A6374]">
                    Nossa equipe provisiona suas credenciais personalizadas para que sua empresa faça cotações com total sigilo comercial.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  aria-label="Fechar modal"
                  className="rounded-lg border border-[#E7E4DC] bg-[#FAF9F6] p-1.5 text-[#6A6374] transition-colors hover:bg-[#F2EFE9] hover:text-[#1B1523]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {!submitted ? (
                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="req-name"
                        className="block text-xs font-medium text-[#1B1523]"
                      >
                        Nome completo *
                      </label>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8E869B]" />
                        <input
                          id="req-name"
                          type="text"
                          required
                          placeholder="Seu nome"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          disabled={requestAccessMutation.isPending}
                          className="w-full rounded-xl border border-[#E7E4DC] bg-[#FAF9F6] py-2.5 pl-9 pr-3 text-sm text-[#1B1523] placeholder-[#8E869B] focus:border-[#682ABA] focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="req-company"
                        className="block text-xs font-medium text-[#1B1523]"
                      >
                        Empresa *
                      </label>
                      <div className="relative">
                        <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8E869B]" />
                        <input
                          id="req-company"
                          type="text"
                          required
                          placeholder="Nome da empresa"
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          disabled={requestAccessMutation.isPending}
                          className="w-full rounded-xl border border-[#E7E4DC] bg-[#FAF9F6] py-2.5 pl-9 pr-3 text-sm text-[#1B1523] placeholder-[#8E869B] focus:border-[#682ABA] focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="req-email"
                        className="block text-xs font-medium text-[#1B1523]"
                      >
                        E-mail corporativo *
                      </label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8E869B]" />
                        <input
                          id="req-email"
                          type="email"
                          required
                          placeholder="voce@empresa.com.br"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={requestAccessMutation.isPending}
                          className="w-full rounded-xl border border-[#E7E4DC] bg-[#FAF9F6] py-2.5 pl-9 pr-3 text-sm text-[#1B1523] placeholder-[#8E869B] focus:border-[#682ABA] focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="req-phone"
                        className="block text-xs font-medium text-[#1B1523]"
                      >
                        WhatsApp / Telefone
                      </label>
                      <input
                        id="req-phone"
                        type="tel"
                        placeholder="(00) 90000-0000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={requestAccessMutation.isPending}
                        className="w-full rounded-xl border border-[#E7E4DC] bg-[#FAF9F6] px-3 py-2.5 text-sm text-[#1B1523] placeholder-[#8E869B] focus:border-[#682ABA] focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="req-demanda"
                      className="block text-xs font-medium text-[#1B1523]"
                    >
                      O que sua empresa busca importar? (opcional)
                    </label>
                    <textarea
                      id="req-demanda"
                      rows={2}
                      placeholder="Ex: Matérias-primas industriais, insumos químicos, aço, embalagens..."
                      value={demanda}
                      onChange={(e) => setDemanda(e.target.value)}
                      disabled={requestAccessMutation.isPending}
                      className="w-full rounded-xl border border-[#E7E4DC] bg-[#FAF9F6] px-3 py-2 text-sm text-[#1B1523] placeholder-[#8E869B] focus:border-[#682ABA] focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col-reverse gap-2.5 pt-2 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={handleResetAndClose}
                      className="rounded-xl border border-[#E7E4DC] bg-white px-4 py-2.5 text-xs font-medium text-[#6A6374] transition-colors hover:bg-[#FAF9F6] hover:text-[#1B1523]"
                    >
                      Cancelar
                    </button>
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      transition={SPRING_SNAPPY}
                      type="submit"
                      disabled={requestAccessMutation.isPending}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#682ABA] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#5A23A3] disabled:opacity-60"
                    >
                      {requestAccessMutation.isPending ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Enviando solicitação...</span>
                        </>
                      ) : (
                        <>
                          <span>Solicitar minhas credenciais</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </motion.button>
                  </div>
                </form>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-5 space-y-4"
                >
                  <div className="flex items-start gap-3 rounded-xl border border-[#28E7C5]/40 bg-[#ECFCF8] p-3.5">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#0F9D84]" />
                    <div className="space-y-1 text-xs">
                      <p className="font-semibold text-[#1B1523]">
                        {deliveredByServer
                          ? "Solicitação enviada para a equipe SUPPLEY!"
                          : "Solicitação registrada e pronta para envio!"}
                      </p>
                      <p className="text-[#4B4555]">
                        {deliveredByServer
                          ? "Nosso time já recebeu os dados da sua empresa e retornará com suas credenciais corporativas."
                          : "Envie por e-mail para nossa equipe ou copie os dados abaixo para encaminhar ao administrador SUPPLEY."}
                      </p>
                    </div>
                  </div>

                  <pre className="max-h-44 overflow-y-auto rounded-xl border border-[#E7E4DC] bg-[#FAF9F6] p-3.5 font-mono text-xs leading-relaxed text-[#1B1523]">
                    {formattedMessage}
                  </pre>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E7E4DC] bg-white px-4 py-2.5 text-xs font-semibold text-[#1B1523] transition-colors hover:bg-[#FAF9F6]"
                    >
                      <Copy className="h-3.5 w-3.5 text-[#682ABA]" />
                      <span>Copiar solicitação</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleMailto}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#682ABA] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#5A23A3]"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      <span>Enviar por e-mail</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs text-[#6A6374]">
                    <button
                      type="button"
                      onClick={() => setSubmitted(false)}
                      className="hover:text-[#1B1523] hover:underline"
                    >
                      ← Editar dados
                    </button>
                    <button
                      type="button"
                      onClick={handleResetAndClose}
                      className="hover:text-[#1B1523] hover:underline"
                    >
                      Concluir
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default RequestAccessModal;
