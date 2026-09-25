import React, { useState } from 'react';
import { DEV_USERS, getEffectiveUserEmail, setEffectiveUserEmail } from '../../devConfig';
import { User, ShieldCheck, Cpu } from 'lucide-react';

interface HeaderProps {
  onUserChanged?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onUserChanged }) => {
  const [currentUser, setCurrentUser] = useState(getEffectiveUserEmail());

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newUser = e.target.value;
    setEffectiveUserEmail(newUser);
    setCurrentUser(newUser);
    if (onUserChanged) onUserChanged();
  };

  return (
    <header className="h-16 border-b border-slate-800/80 bg-[#070b12]/90 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/20">
          <Cpu className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-100 tracking-tight">
              Base<span className="text-blue-500">BFS</span> Platform
            </h1>
            <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-mono">
              v1.0-starter
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Plantilla de Desarrollo Local & Paridad con bfs_US</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Selector de Usuario Local Simulado */}
        <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-1.5 text-xs">
          <User className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-slate-400 hidden sm:inline">Usuario Local:</span>
          <select
            value={currentUser}
            onChange={handleUserChange}
            className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
          >
            <option value={DEV_USERS.FRANCISCO} className="bg-slate-900 text-white">
              Francisco Barrera (Admin)
            </option>
            <option value={DEV_USERS.DEVELOPER} className="bg-slate-900 text-white">
              Equipo Desarrollador (Dev)
            </option>
            <option value={DEV_USERS.GUEST} className="bg-slate-900 text-white">
              Usuario Invitado (Guest)
            </option>
          </select>
        </div>

        {/* Indicador de entorno */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Local Mode (Zero Cloud DB)</span>
        </div>
      </div>
    </header>
  );
};
