"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export type LanguageCode = "en" | "es" | "hi" | "pt" | "zh" | "fr";

export const LANGUAGES: { code: LanguageCode; label: string }[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "hi", label: "हिन्दी" },
  { code: "pt", label: "Português" },
  { code: "zh", label: "中文" },
  { code: "fr", label: "Français" },
];

type Dict = Record<string, string>;

// A core set of UI strings translated across all 6 supported languages.
// This is the foundation to build on — wire `t("key")` into any string
// throughout the app and add the key here to extend translation coverage.
const translations: Record<LanguageCode, Dict> = {
  en: {
    home: "Home", explore: "Explore", notifications: "Notifications", messages: "Messages",
    bookmarks: "Bookmarks", profile: "Profile", more: "More", post: "Post",
    signIn: "Sign in", signUp: "Sign up", createAccount: "Create account", logOut: "Log out",
    editProfile: "Edit profile", settings: "Settings", whatsHappening: "What's happening?",
    happeningNow: "Happening now", joinToday: "Join today.", save: "Save", cancel: "Cancel",
  },
  es: {
    home: "Inicio", explore: "Explorar", notifications: "Notificaciones", messages: "Mensajes",
    bookmarks: "Marcadores", profile: "Perfil", more: "Más", post: "Publicar",
    signIn: "Iniciar sesión", signUp: "Registrarse", createAccount: "Crear cuenta", logOut: "Cerrar sesión",
    editProfile: "Editar perfil", settings: "Configuración", whatsHappening: "¿Qué está pasando?",
    happeningNow: "Sucediendo ahora", joinToday: "Únete hoy.", save: "Guardar", cancel: "Cancelar",
  },
  hi: {
    home: "होम", explore: "एक्सप्लोर करें", notifications: "सूचनाएं", messages: "संदेश",
    bookmarks: "बुकमार्क", profile: "प्रोफ़ाइल", more: "अधिक", post: "पोस्ट करें",
    signIn: "साइन इन करें", signUp: "साइन अप करें", createAccount: "खाता बनाएं", logOut: "लॉग आउट",
    editProfile: "प्रोफ़ाइल संपादित करें", settings: "सेटिंग्स", whatsHappening: "क्या हो रहा है?",
    happeningNow: "अभी हो रहा है", joinToday: "आज ही जुड़ें।", save: "सहेजें", cancel: "रद्द करें",
  },
  pt: {
    home: "Início", explore: "Explorar", notifications: "Notificações", messages: "Mensagens",
    bookmarks: "Favoritos", profile: "Perfil", more: "Mais", post: "Postar",
    signIn: "Entrar", signUp: "Inscrever-se", createAccount: "Criar conta", logOut: "Sair",
    editProfile: "Editar perfil", settings: "Configurações", whatsHappening: "O que está acontecendo?",
    happeningNow: "Acontecendo agora", joinToday: "Junte-se hoje.", save: "Salvar", cancel: "Cancelar",
  },
  zh: {
    home: "首页", explore: "探索", notifications: "通知", messages: "消息",
    bookmarks: "书签", profile: "个人资料", more: "更多", post: "发布",
    signIn: "登录", signUp: "注册", createAccount: "创建账户", logOut: "退出登录",
    editProfile: "编辑个人资料", settings: "设置", whatsHappening: "发生什么事了？",
    happeningNow: "正在发生", joinToday: "立即加入。", save: "保存", cancel: "取消",
  },
  fr: {
    home: "Accueil", explore: "Explorer", notifications: "Notifications", messages: "Messages",
    bookmarks: "Signets", profile: "Profil", more: "Plus", post: "Publier",
    signIn: "Se connecter", signUp: "S'inscrire", createAccount: "Créer un compte", logOut: "Se déconnecter",
    editProfile: "Modifier le profil", settings: "Paramètres", whatsHappening: "Quoi de neuf ?",
    happeningNow: "Ça se passe maintenant", joinToday: "Rejoignez-nous aujourd'hui.", save: "Enregistrer", cancel: "Annuler",
  },
};

interface LanguageContextType {
  language: LanguageCode;
  setLanguageLocal: (lang: LanguageCode) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<LanguageCode>("en");
  const { user } = useAuth();

  // Restore from localStorage for logged-out visitors.
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("twiller-language") : null;
    if (stored && translations[stored as LanguageCode]) {
      setLanguage(stored as LanguageCode);
    }
  }, []);

  // Once a user is loaded, their verified server-side language preference wins.
  useEffect(() => {
    if (user?.language && translations[user.language as LanguageCode]) {
      setLanguage(user.language as LanguageCode);
    }
  }, [user?.language]);

  const setLanguageLocal = (lang: LanguageCode) => {
    setLanguage(lang);
    if (typeof window !== "undefined") localStorage.setItem("twiller-language", lang);
  };

  const t = (key: string) => translations[language]?.[key] || translations.en[key] || key;

  return (
    <LanguageContext.Provider value={{ language, setLanguageLocal, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
