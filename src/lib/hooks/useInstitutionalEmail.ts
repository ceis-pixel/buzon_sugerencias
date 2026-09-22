import { useCallback, useMemo, useState } from "react";

export const INSTITUTIONAL_DOMAIN = "unsch.edu.pe";
export const INSTITUTIONAL_DOMAIN_SUFFIX = `@${INSTITUTIONAL_DOMAIN}`;

export interface UseInstitutionalEmailReturn {
  email: string;
  setEmail: (value: string) => void;
  isValidDomain: boolean;
  isDomainError: boolean;
  isTouched: boolean;
  errorMessage: string | null;
  handleBlur: () => void;
  reset: () => void;
}

/**
 * Hook to validate institutional @unsch.edu.pe email addresses in real-time,
 * following Section 4.1 of the Crimson Heritage Design System.
 */
export function useInstitutionalEmail(
  initialEmail: string = "",
): UseInstitutionalEmailReturn {
  const [email, setEmailState] = useState<string>(initialEmail);
  const [isTouched, setIsTouched] = useState<boolean>(false);

  const setEmail = useCallback((value: string) => {
    setEmailState(value);
    if (!isTouched && value.length > 0) {
      setIsTouched(true);
    }
  }, [isTouched]);

  const handleBlur = useCallback(() => {
    setIsTouched(true);
  }, []);

  const reset = useCallback(() => {
    setEmailState("");
    setIsTouched(false);
  }, []);

  const { isValidDomain, isDomainError, errorMessage } = useMemo(() => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      return {
        isValidDomain: false,
        isDomainError: false,
        errorMessage: null,
      };
    }

    if (!cleanEmail.includes("@")) {
      return {
        isValidDomain: false,
        isDomainError: isTouched && cleanEmail.length > 0,
        errorMessage: isTouched
          ? "Ingresa tu dirección de correo electrónico institucional completa."
          : null,
      };
    }

    const atIndex = cleanEmail.indexOf("@");
    const localPart = cleanEmail.slice(0, atIndex);
    const domainPart = cleanEmail.slice(atIndex + 1);

    // Valid email format with local part and exactly @unsch.edu.pe
    if (localPart.length > 0 && domainPart === INSTITUTIONAL_DOMAIN) {
      return {
        isValidDomain: true,
        isDomainError: false,
        errorMessage: null,
      };
    }

    // User is in the process of typing @unsch.edu.pe
    if (domainPart.length === 0 || INSTITUTIONAL_DOMAIN.startsWith(domainPart)) {
      return {
        isValidDomain: false,
        isDomainError: isTouched && domainPart.length > 0 && domainPart !== INSTITUTIONAL_DOMAIN,
        errorMessage: null,
      };
    }

    // Explicit non-institutional domain detected (e.g. gmail.com, hotmail.com, unsch.com)
    return {
      isValidDomain: false,
      isDomainError: true,
      errorMessage:
        "Debes usar tu correo universitario con terminación @unsch.edu.pe para acceder al buzón.",
    };
  }, [email, isTouched]);

  return {
    email,
    setEmail,
    isValidDomain,
    isDomainError,
    isTouched,
    errorMessage,
    handleBlur,
    reset,
  };
}
