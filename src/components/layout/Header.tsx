import React, { useState } from 'react';
import { Cpu, ShieldCheck, User } from 'lucide-react';
import { DEV_USERS, getEffectiveUserEmail, setEffectiveUserEmail } from '../../devConfig';
import { SearchableSelect } from '../common/SearchableSelect';

interface HeaderProps {
  onUserChanged?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onUserChanged }) => {
  const [currentUser, setCurrentUser] = useState(getEffectiveUserEmail());

  const handleUserChange = (newUser: string) => {
    setEffectiveUserEmail(newUser);
    setCurrentUser(newUser);
    onUserChanged?.();
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 font-bold text-white shadow-md shadow-blue-500/20">
          <Cpu className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-tight text-slate-950">
              Plataforma Base<span className="text-blue-500">BFS</span>
            </h1>
            <span className="rounded border border-blue-500/20 bg-blue-500/10 px-1.5 py-0.5 font-mono text-[10px] text-blue-500">
              v1.0-inicial
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Plantilla de desarrollo local y paridad con bfs_US</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs">
          <User className="h-3.5 w-3.5 shrink-0 text-blue-500" />
          <span className="hidden text-slate-500 sm:inline">Usuario local:</span>
          <div className="w-[220px] max-w-[30vw]">
            <SearchableSelect
              value={currentUser}
              onChange={handleUserChange}
              options={[
                { value: DEV_USERS.FRANCISCO, label: 'Francisco Barrera (Administrador)' },
                { value: DEV_USERS.DEVELOPER, label: 'Equipo de desarrollo' },
                { value: DEV_USERS.GUEST, label: 'Usuario invitado' },
              ]}
              ariaLabel="Usuario local"
              searchPlaceholder="Buscar usuario"
            />
          </div>
        </div>

        <div className="hidden items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-600 md:flex">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Modo local (base de datos sin nube)</span>
        </div>
      </div>
    </header>
  );
};
