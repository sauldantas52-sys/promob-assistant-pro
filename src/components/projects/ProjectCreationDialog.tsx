import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { CreateProjectInput, ProjectClient } from "@/lib/projects/data";

type Props = {
  open: boolean;
  clients: ProjectClient[];
  isLoadingClients: boolean;
  clientsError: string | null;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: Omit<CreateProjectInput, "companyId">) => void;
};

const steps = ["Cliente", "Projeto", "Endereço", "Ambientes"];

const initialSite = {
  postalCode: "",
  street: "",
  number: "",
  complement: "",
  district: "",
  city: "",
  state: "",
  reference: "",
  contactName: "",
  contactPhone: "",
};

export function ProjectCreationDialog({
  open,
  clients,
  isLoadingClients,
  clientsError,
  isSaving,
  onOpenChange,
  onSubmit,
}: Props) {
  const [step, setStep] = useState(0);
  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [clientId, setClientId] = useState("");
  const [newClient, setNewClient] = useState({ name: "", phone: "", email: "", document: "" });
  const [projectName, setProjectName] = useState("");
  const [site, setSite] = useState(initialSite);
  const [environments, setEnvironments] = useState([""]);

  const selectedClient = clients.find((client) => client.id === clientId);
  const canContinue =
    step === 0
      ? clientMode === "existing"
        ? !!selectedClient
        : !!newClient.name.trim()
      : step === 1
        ? !!projectName.trim()
        : step === 2
          ? !!site.street.trim() &&
            !!site.number.trim() &&
            !!site.city.trim() &&
            site.state.trim().length === 2
          : environments.some((environment) => environment.trim());

  function reset() {
    setStep(0);
    setClientMode("existing");
    setClientId("");
    setNewClient({ name: "", phone: "", email: "", document: "" });
    setProjectName("");
    setSite(initialSite);
    setEnvironments([""]);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && !isSaving) reset();
    onOpenChange(nextOpen);
  }

  function submit() {
    if (!canContinue) return;
    const client =
      clientMode === "existing" && selectedClient
        ? { mode: "existing" as const, id: selectedClient.id, name: selectedClient.name }
        : { mode: "new" as const, ...newClient };
    onSubmit({ client, projectName, site, environments });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto border-slate-800 bg-slate-950 p-0 text-white">
        <DialogHeader className="border-b border-slate-800 px-5 py-5 sm:px-7">
          <DialogTitle className="text-xl font-black uppercase tracking-tight">
            Novo projeto
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Cadastro operacional em quatro etapas. Os dados são gravados somente ao final.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-4 border-b border-slate-800">
          {steps.map((label, index) => (
            <div
              key={label}
              className={cn(
                "border-r border-slate-800 px-2 py-3 text-center text-[9px] font-black uppercase tracking-wider last:border-r-0",
                index === step ? "bg-lime-300 text-slate-950" : "text-slate-500",
                index < step && "text-lime-300",
              )}
            >
              <span className="mr-1 font-mono">
                {index < step ? <Check className="inline h-3 w-3" /> : `0${index + 1}`}
              </span>{" "}
              <span className="hidden sm:inline">{label}</span>
            </div>
          ))}
        </div>

        <div className="min-h-72 space-y-5 px-5 py-6 sm:px-7">
          {step === 0 && (
            <>
              <div className="grid grid-cols-2 gap-2 rounded-md bg-slate-900 p-1">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setClientMode("existing")}
                  className={cn(
                    "text-xs font-bold",
                    clientMode === "existing" && "bg-white text-slate-950 hover:bg-white",
                  )}
                >
                  Cliente existente
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setClientMode("new")}
                  className={cn(
                    "text-xs font-bold",
                    clientMode === "new" && "bg-white text-slate-950 hover:bg-white",
                  )}
                >
                  Novo cliente
                </Button>
              </div>
              {clientMode === "existing" ? (
                <Field label="Cliente" htmlFor="client-select">
                  <Select value={clientId} onValueChange={setClientId} disabled={isLoadingClients}>
                    <SelectTrigger id="client-select" className="border-slate-700 bg-slate-900">
                      <SelectValue
                        placeholder={
                          isLoadingClients ? "Carregando clientes..." : "Selecione um cliente"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {clientsError ? (
                    <p className="mt-2 text-xs text-red-300">{clientsError}</p>
                  ) : !isLoadingClients && clients.length === 0 ? (
                    <p className="mt-2 text-xs text-amber-300">
                      Nenhum cliente cadastrado. Selecione “Novo cliente”.
                    </p>
                  ) : null}
                </Field>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    label="Nome / razão social *"
                    value={newClient.name}
                    onChange={(name) => setNewClient((value) => ({ ...value, name }))}
                  />
                  <TextField
                    label="CPF / CNPJ"
                    value={newClient.document}
                    onChange={(document) => setNewClient((value) => ({ ...value, document }))}
                  />
                  <TextField
                    label="Telefone"
                    value={newClient.phone}
                    onChange={(phone) => setNewClient((value) => ({ ...value, phone }))}
                  />
                  <TextField
                    label="E-mail"
                    type="email"
                    value={newClient.email}
                    onChange={(email) => setNewClient((value) => ({ ...value, email }))}
                  />
                </div>
              )}
            </>
          )}

          {step === 1 && (
            <TextField
              label="Nome da obra / projeto *"
              value={projectName}
              onChange={setProjectName}
              placeholder="Ex.: Residência Silva - apartamento 402"
            />
          )}

          {step === 2 && (
            <div className="grid gap-4 sm:grid-cols-6">
              <div className="sm:col-span-2">
                <TextField
                  label="CEP"
                  value={site.postalCode}
                  onChange={(postalCode) => setSite((value) => ({ ...value, postalCode }))}
                />
              </div>
              <div className="sm:col-span-4">
                <TextField
                  label="Rua / avenida *"
                  value={site.street}
                  onChange={(street) => setSite((value) => ({ ...value, street }))}
                />
              </div>
              <div className="sm:col-span-2">
                <TextField
                  label="Número *"
                  value={site.number}
                  onChange={(number) => setSite((value) => ({ ...value, number }))}
                />
              </div>
              <div className="sm:col-span-4">
                <TextField
                  label="Complemento"
                  value={site.complement}
                  onChange={(complement) => setSite((value) => ({ ...value, complement }))}
                />
              </div>
              <div className="sm:col-span-3">
                <TextField
                  label="Bairro"
                  value={site.district}
                  onChange={(district) => setSite((value) => ({ ...value, district }))}
                />
              </div>
              <div className="sm:col-span-2">
                <TextField
                  label="Cidade *"
                  value={site.city}
                  onChange={(city) => setSite((value) => ({ ...value, city }))}
                />
              </div>
              <div className="sm:col-span-1">
                <TextField
                  label="UF *"
                  maxLength={2}
                  value={site.state}
                  onChange={(state) => setSite((value) => ({ ...value, state }))}
                />
              </div>
              <div className="sm:col-span-3">
                <TextField
                  label="Contato na obra"
                  value={site.contactName}
                  onChange={(contactName) => setSite((value) => ({ ...value, contactName }))}
                />
              </div>
              <div className="sm:col-span-3">
                <TextField
                  label="Telefone do contato"
                  value={site.contactPhone}
                  onChange={(contactPhone) => setSite((value) => ({ ...value, contactPhone }))}
                />
              </div>
              <div className="sm:col-span-6">
                <TextField
                  label="Referência"
                  value={site.reference}
                  onChange={(reference) => setSite((value) => ({ ...value, reference }))}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <Label className="text-[10px] font-black uppercase tracking-widest text-lime-300">
                    Ambientes *
                  </Label>
                  <p className="mt-1 text-xs text-slate-400">
                    Cadastre cada cômodo como uma unidade de produção.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-slate-700 bg-slate-900"
                  onClick={() => setEnvironments((value) => [...value, ""])}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Ambiente
                </Button>
              </div>
              {environments.map((environment, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    aria-label={`Ambiente ${index + 1}`}
                    placeholder={`Ambiente ${index + 1}`}
                    value={environment}
                    onChange={(event) =>
                      setEnvironments((values) =>
                        values.map((value, itemIndex) =>
                          itemIndex === index ? event.target.value : value,
                        ),
                      )
                    }
                    className="border-slate-700 bg-slate-900"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Remover ambiente ${index + 1}`}
                    disabled={environments.length === 1}
                    onClick={() =>
                      setEnvironments((values) =>
                        values.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4 text-slate-400" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-slate-800 px-5 py-4 sm:px-7">
          <Button
            type="button"
            variant="ghost"
            disabled={step === 0 || isSaving}
            onClick={() => setStep((value) => value - 1)}
            className="text-slate-300"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          {step < steps.length - 1 ? (
            <Button
              type="button"
              disabled={!canContinue}
              onClick={() => setStep((value) => value + 1)}
              className="bg-lime-300 font-black uppercase text-slate-950 hover:bg-lime-200"
            >
              Continuar <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              disabled={!canContinue || isSaving}
              onClick={submit}
              className="bg-lime-300 font-black uppercase text-slate-950 hover:bg-lime-200"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar projeto
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label
        htmlFor={htmlFor}
        className="text-[10px] font-black uppercase tracking-widest text-lime-300"
      >
        {label}
      </Label>
      {children}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  ...props
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  const id = `project-field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <Field label={label} htmlFor={id}>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="border-slate-700 bg-slate-900"
        {...props}
      />
    </Field>
  );
}
