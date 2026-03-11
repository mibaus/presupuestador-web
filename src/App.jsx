import { useState, useEffect, useMemo, useRef, useCallback, Component } from 'react';
import { Sun, Moon, Gear, Copy, ShareNetwork, X, Trash, Plus, Users, CalendarBlank, CurrencyDollar, Percent, CreditCard, Calculator, Sparkle, Leaf, Snowflake } from '@phosphor-icons/react'
import tariffsSummer from './data/tariffs.summer.json'
import tariffsAutumn from './data/tariffs.autumn.json'
import tariffsWinter from './data/tariffs.winter.json'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error capturado:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md shadow-lg">
            <h2 className="text-xl font-bold text-red-600 mb-2">Error en la aplicación</h2>
            <p className="text-gray-700 mb-4">Algo salió mal al calcular el presupuesto.</p>
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto mb-4">
              {this.state.error?.toString()}
            </pre>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const formatARS = (valueInCents) => {
  const pesos = Math.round((valueInCents || 0) / 100);
  const formatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return formatter.format(pesos);
};

const parseToCents = (raw) => {
  if (!raw) return 0;
  const s = String(raw).trim().replace(/[^0-9.,]/g, '');
  if (!s) return 0;

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');

  let normalized = s;
  if (hasComma && hasDot) {
    normalized = s.replace(/\./g, '').replace(/,/g, '.');
  } else if (hasComma) {
    normalized = s.replace(/,/g, '.');
  } else if (hasDot) {
    normalized = s.replace(/\./g, '');
  } else {
    normalized = s;
  }

  const num = Number.parseFloat(normalized);
  if (Number.isNaN(num)) return 0;
  return Math.round(num * 100);
};

const pickBandForPeople = (tariffs, people) => {
  if (!tariffs || !Array.isArray(tariffs.peopleBands)) return null;
  const bands = [...tariffs.peopleBands].sort((a, b) => a.people - b.people);
  const exact = bands.find(b => b.people === people);
  if (exact) return exact;
  const higher = bands.find(b => b.people >= people);
  if (higher) return higher;
  return bands[bands.length - 1] || null;
};

const pickLongStayDiscount = (tariffs, nights) => {
  if (!tariffs || !Array.isArray(tariffs.longStayDiscounts)) return null;
  const sorted = [...tariffs.longStayDiscounts].sort((a, b) => b.minNights - a.minNights);
  const match = sorted.find(d => nights >= d.minNights);
  return match ? match.discountPercent : null;
};

function App() {
  const [pricePerNight, setPricePerNight] = useState('');
  const [numberOfNights, setNumberOfNights] = useState('');
  const [numberOfPeople, setNumberOfPeople] = useState('');
  const [discount, setDiscount] = useState(0);
  const [summerPaymentPlan, setSummerPaymentPlan] = useState('2');
  const [autumnPaymentPlan, setAutumnPaymentPlan] = useState('2');
  const [winterPaymentPlan, setWinterPaymentPlan] = useState('2');
  const [computed, setComputed] = useState(null);
  // Masajes — precio interno fijo, nunca visible para el cliente
  const [numberOfMassages, setNumberOfMassages] = useState(0);
  const [massagePriceCents, setMassagePriceCents] = useState(3500000); // $35.000 ARS internos
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('themePreference');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [season, setSeason] = useState('summer');
  const [activeTariffs, setActiveTariffs] = useState(tariffsSummer);
  const [suggestedPriceCents, setSuggestedPriceCents] = useState(0);
  const [manualPriceEdited, setManualPriceEdited] = useState(false);
  const [suggestedStayDiscount, setSuggestedStayDiscount] = useState(null);
  const [manualDiscountEdited, setManualDiscountEdited] = useState(false);
  const [screen, setScreen] = useState('main');
  const [showMenu, setShowMenu] = useState(false);
  const [overrides, setOverrides] = useState({ summer: null, autumn: null, winter: null });
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isSwipeEnabled, setIsSwipeEnabled] = useState(() => {
    const saved = localStorage.getItem('swipeSeasonToggle');
    return saved ? saved === 'true' : true;
  });
  const resumenRef = useRef(null);
  const waitingServiceWorker = useRef(null);

  const seasonalColors = {
    summer: {
      primary: isDarkMode ? 'bg-[#19d16b]' : 'bg-[#2ee96f]',
      secondary: isDarkMode ? 'bg-[#14a955]' : 'bg-[#6ff28f]',
      accent: isDarkMode ? 'bg-[#063a1d]' : 'bg-[#e9fce9]',
      border: isDarkMode ? 'border-[#1c7a45]' : 'border-[#9cf5bb]',
      text: isDarkMode ? 'text-[#7cfcc0]' : 'text-[#138a46]',
    },
    autumn: {
      primary: isDarkMode ? 'bg-orange-400' : 'bg-orange-500',
      secondary: isDarkMode ? 'bg-orange-300' : 'bg-orange-400',
      accent: isDarkMode ? 'bg-orange-900/30' : 'bg-orange-50',
      border: isDarkMode ? 'border-orange-600' : 'border-orange-300',
      text: isDarkMode ? 'text-orange-400' : 'text-orange-600',
    },
    winter: {
      primary: isDarkMode ? 'bg-[#0ea5e9]' : 'bg-[#38bdf8]',
      secondary: isDarkMode ? 'bg-[#38bdf8]' : 'bg-[#7dd3fc]',
      accent: isDarkMode ? 'bg-[#082f49]' : 'bg-[#e0f2fe]',
      border: isDarkMode ? 'border-[#0c4a6e]' : 'border-[#bae6fd]',
      text: isDarkMode ? 'text-[#7dd3fc]' : 'text-[#0369a1]',
    },
  };

  const seasonOrder = ['summer', 'autumn', 'winter'];

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('themePreference', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('themePreference', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('swipeSeasonToggle', isSwipeEnabled ? 'true' : 'false');
  }, [isSwipeEnabled]);

  useEffect(() => {
    const base = season === 'autumn' ? tariffsAutumn : season === 'winter' ? tariffsWinter : tariffsSummer;
    const ov = overrides?.[season];
    if (ov) {
      const merged = {
        ...base,
        peopleBands: Array.isArray(ov.peopleBands) && ov.peopleBands.length > 0 ? ov.peopleBands : base.peopleBands,
        longStayDiscounts: Array.isArray(ov.longStayDiscounts) ? ov.longStayDiscounts : base.longStayDiscounts,
      };
      setActiveTariffs(merged);
    } else {
      setActiveTariffs(base);
    }
    setManualDiscountEdited(false);
  }, [season, overrides]);

  useEffect(() => {
    const people = numberOfPeople === '' ? 0 : parseInt(numberOfPeople);
    if (!activeTariffs || !people) {
      setSuggestedPriceCents(0);
      return;
    }
    const band = pickBandForPeople(activeTariffs, people);
    setSuggestedPriceCents(band?.pricePerNight ? band.pricePerNight * 100 : 0);
  }, [activeTariffs, numberOfPeople]);

  useEffect(() => {
    if (suggestedPriceCents > 0 && (!manualPriceEdited || !pricePerNight)) {
      const asPesos = Math.round(suggestedPriceCents / 100).toLocaleString('es-AR');
      setPricePerNight(asPesos);
    }
  }, [suggestedPriceCents]);

  useEffect(() => {
    const nights = numberOfNights === '' ? 0 : parseInt(numberOfNights);
    if (!activeTariffs || !nights) {
      setSuggestedStayDiscount(null);
      return;
    }
    const d = pickLongStayDiscount(activeTariffs, nights);
    setSuggestedStayDiscount(d);
  }, [activeTariffs, numberOfNights]);

  useEffect(() => {
    const saved = localStorage.getItem('tariffOverrides');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const fallback = { summer: null, autumn: null, winter: null };
        setOverrides({ ...fallback, ...(parsed || {}) });
        if (parsed?.massagePriceCents) {
          setMassagePriceCents(parsed.massagePriceCents);
        }
      } catch (e) {
        console.error('Error loading overrides', e);
      }
    }
  }, []);

  useEffect(() => {
    if (season === 'autumn' && suggestedStayDiscount && !manualDiscountEdited) {
      setDiscount(suggestedStayDiscount / 100);
    }
  }, [season, suggestedStayDiscount, manualDiscountEdited]);

  // Reevaluar descuento al cambiar de estación
  useEffect(() => {
    const nights = numberOfNights === '' ? 0 : parseInt(numberOfNights);
    if (nights > 0 && discount > 0 && activeTariffs) {
      // Obtener el descuento sugerido para las noches actuales en la nueva estación
      const newSuggestedDiscount = pickLongStayDiscount(activeTariffs, nights);
      const currentDiscountPercent = discount * 100;

      // Si el descuento actual no coincide con ningún descuento válido en la nueva estación, ajustarlo
      const validDiscounts = activeTariffs.longStayDiscounts?.map(d => d.discount) || [];
      if (!validDiscounts.includes(currentDiscountPercent)) {
        // Si hay un descuento sugerido para estas noches, usarlo
        if (newSuggestedDiscount) {
          setDiscount(newSuggestedDiscount / 100);
        } else {
          // Si no hay descuento sugerido, quitar el descuento
          setDiscount(0);
        }
        setManualDiscountEdited(false);
      }
    }
  }, [season, activeTariffs]);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = localStorage.getItem('installPromptDismissed');
      if (!dismissed) {
        setShowInstallPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    const evaluateDevice = () => {
      if (typeof window === 'undefined') return;
      const finePointer = window.matchMedia('(pointer:fine)').matches;
      const ua = navigator.userAgent.toLowerCase();
      const isMobileUA = /android|iphone|ipad|ipod/i.test(ua);
      setIsDesktop(finePointer && !isMobileUA);
    };

    evaluateDevice();
    window.addEventListener('resize', evaluateDevice);
    return () => window.removeEventListener('resize', evaluateDevice);
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const monitorInstallingWorker = (worker) => {
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          waitingServiceWorker.current = worker;
          setIsUpdateAvailable(true);
        }
      });
    };

    let cleanupUpdateFound = null;

    navigator.serviceWorker.getRegistration().then((registration) => {
      if (!registration) return;
      monitorInstallingWorker(registration.installing);
      const updateFoundHandler = () => monitorInstallingWorker(registration.installing);
      registration.addEventListener('updatefound', updateFoundHandler);
      cleanupUpdateFound = () => registration.removeEventListener('updatefound', updateFoundHandler);
    });

    const onControllerChange = () => {
      setIsUpdateAvailable(false);
      waitingServiceWorker.current = null;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      if (cleanupUpdateFound) cleanupUpdateFound();
    };
  }, []);

  useEffect(() => {
    if (computed && canCalculate) {
      onCalculate();
    }
  }, [discount, summerPaymentPlan, autumnPaymentPlan]);

  const saveOverrides = (newOverrides) => {
    try {
      const payload = { ...newOverrides, massagePriceCents };
      localStorage.setItem('tariffOverrides', JSON.stringify(payload));
      setOverrides(newOverrides);
      setFeedbackMessage('Cambios guardados');
      setTimeout(() => {
        setFeedbackMessage('');
        setScreen('main');
      }, 1500);
    } catch (e) {
      console.error('Error saving overrides', e);
      setFeedbackMessage('Error al guardar');
      setTimeout(() => setFeedbackMessage(''), 1500);
    }
  };

  const discountOptions = useMemo(() => {
    const percents = new Set(
      (activeTariffs?.longStayDiscounts || []).map(d => d.discountPercent)
    );
    percents.add(20);
    if (['summer', 'autumn', 'winter'].includes(season)) {
      percents.add(10);
      percents.add(15);
    }
    const ordered = Array.from(percents)
      .filter(p => typeof p === 'number' && p > 0)
      .sort((a, b) => a - b);
    return ordered.map(p => ({ label: `${p}%`, value: p / 100 }));
  }, [activeTariffs, season]);

  const canCalculate = parseToCents(pricePerNight) > 0 && parseInt(numberOfNights) > 0 && parseInt(numberOfPeople) > 0;

  const onCalculate = () => {
    try {
      const pricePerNightCents = parseToCents(pricePerNight);
      const nights = parseInt(numberOfNights);

      if (pricePerNightCents <= 0 || nights <= 0) {
        setComputed(null);
        return;
      }

      // ── Orden estricto de operaciones ──────────────────────────────
      // 1. Subtotal Alojamiento
      const subtotalAlojamiento = pricePerNightCents * nights;
      // 2. Aplicar descuento SOLO al alojamiento
      const discountAmount = Math.round(subtotalAlojamiento * discount);
      const alojamientoConDescuento = subtotalAlojamiento - discountAmount;
      // 3. Sumar masajes SIN descuento
      const massages = numberOfMassages || 0;
      const totalMasajesCents = massages * massagePriceCents;
      // 4. Total Final
      const totalFinal = alojamientoConDescuento + totalMasajesCents;
      // 5. Calcular precio por noche distribuido (incluyendo masajes pero SIN el descuento de larga estadía mostrado aún)
      // El usuario pidió que el "Precio por noche" arriba sea el original + masajes proporcionales? 
      // Releyendo: "Precio por noche $85.000 X 7 noches... Total $595.000... Descuento 15%... Total final"
      // Si hay masajes, el costo debe repartirse en el valor por noche inicial.
      const priceForNightsWithMassages = subtotalAlojamiento + totalMasajesCents;
      const distributedPricePerNight = Math.round(priceForNightsWithMassages / nights);
      // ──────────────────────────────────────────────────────────────

      const currentPlan = season === 'summer' ? summerPaymentPlan
        : season === 'autumn' ? autumnPaymentPlan
          : winterPaymentPlan;

      let sena, segundo, saldo;
      if (currentPlan === '2') {
        sena = Math.round(totalFinal * 0.5);
        segundo = 0;
        saldo = totalFinal - sena;
      } else {
        sena = Math.round(totalFinal * 0.2);
        segundo = Math.round(totalFinal * 0.3);
        saldo = totalFinal - sena - segundo;
      }

      setComputed({
        subtotalAlojamiento,
        discountAmount,
        alojamientoConDescuento,
        totalMasajesCents,
        totalFinal,
        distributedPricePerNight,
        priceForNightsWithMassages,
        // legacy aliases para compatibilidad con código existente
        totalOriginal: subtotalAlojamiento,
        totalWithDiscount: alojamientoConDescuento,
        sena,
        segundo,
        saldo,
        nights,
        massages,
        pricePerNightCents,
        season,
        summerPaymentPlan,
        autumnPaymentPlan,
        winterPaymentPlan,
      });

      // Scroll automático al resumen después de calcular
      setTimeout(() => {
        if (resumenRef.current) {
          resumenRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (error) {
      console.error("Error al calcular:", error);
      setFeedbackMessage("Error al calcular");
    }
  };

  const onClear = () => {
    setPricePerNight('');
    setNumberOfNights('');
    setNumberOfPeople('');
    setDiscount(0);
    setSummerPaymentPlan('2');
    setAutumnPaymentPlan('2');
    setWinterPaymentPlan('2');
    setNumberOfMassages(0);
    setComputed(null);
    setManualPriceEdited(false);
    setManualDiscountEdited(false);
  };

  const getSummaryText = ({ format = 'text' } = {}) => {
    if (!computed) return '';

    const formatValue = (valueInCents) => {
      const pesos = Math.round(valueInCents / 100);
      return `$${pesos.toLocaleString('es-AR')}`;
    };

    const seasonEmoji = computed.season === 'autumn' ? '🍂' : computed.season === 'winter' ? '❄️' : '🏖️';
    const nights = computed.nights;
    const massages = computed.massages || 0;

    const plan = computed.season === 'autumn'
      ? computed.autumnPaymentPlan
      : computed.season === 'winter'
        ? computed.winterPaymentPlan
        : computed.summerPaymentPlan;

    let pagosSection = '';
    if (plan === '2') {
      pagosSection = `📍 1° pago 50% (Seña)\n\n*${formatValue(computed.sena)}*\n\n📍 2° pago 50%. Al llegar en efectivo\n\n*${formatValue(computed.saldo)}*`;
    } else {
      pagosSection = `📍 1° pago 20% (Seña)\n\n*${formatValue(computed.sena)}*\n\n📍 2° pago 30% (Debe abonarse antes de la fecha de ingreso)\n\n*${formatValue(computed.segundo)}*\n\n📍 3° pago 50%. Al llegar en efectivo\n\n*${formatValue(computed.saldo)}*`;
    }

    const inclusionText = massages > 0
      ? `\n(Incluye ${massages} sesión${massages > 1 ? 'es' : ''} de masajes)`
      : '';

    const discountLines = computed.discountAmount > 0
      ? `\n*Descuento ${Math.round(discount * 100)}%: -${formatValue(computed.discountAmount)}*\n*Total final: ${formatValue(computed.totalFinal)}*`
      : '';

    const summary = `${seasonEmoji} Su Presupuesto\n\n✅ Precio por noche ${formatValue(computed.distributedPricePerNight)}\nX ${nights} noche${nights > 1 ? 's' : ''}\n\n✅ *Total ${formatValue(computed.priceForNightsWithMassages)}*${discountLines}${inclusionText}\n\n${pagosSection}\n\n(Por mail enviamos la confirmación de la reserva junto a la factura correspondiente)`;

    if (format === 'html') {
      return summary
        .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br />');
    }

    return summary;
  };

  const onCopyToClipboard = async (value, label) => {
    try {
      const pesos = Math.round(value / 100);
      const textToCopy = `$${pesos.toLocaleString('es-AR')}`;
      await navigator.clipboard.writeText(textToCopy);
      setFeedbackMessage(`¡${label} copiado!`);
      setTimeout(() => setFeedbackMessage(''), 2000);
    } catch (error) {
      console.error("Error al copiar:", error);
      setFeedbackMessage("Error al copiar");
    }
  };

  const onShare = async () => {
    try {
      const payload = getSummaryText({ format: 'text' });
      if (navigator.share) {
        await navigator.share({ text: payload });
        return;
      }

      const clipboardItem = isDesktop && navigator.clipboard?.write
        ? new ClipboardItem({
          'text/html': new Blob([getSummaryText({ format: 'html' })], { type: 'text/html' }),
          'text/plain': new Blob([payload], { type: 'text/plain' }),
        })
        : null;

      if (clipboardItem && navigator.clipboard.write) {
        await navigator.clipboard.write([clipboardItem]);
      } else {
        await navigator.clipboard.writeText(payload);
      }
      setFeedbackMessage("Resumen copiado al portapapeles");
      setTimeout(() => setFeedbackMessage(''), 2000);
    } catch (error) {
      console.error("Error al compartir:", error);
    }
  };

  const seasonEmoji = season === 'summer' ? '🏖️' : season === 'autumn' ? '🍂' : '❄️';
  const colors = seasonalColors[season] || seasonalColors.summer;

  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    if (!isSwipeEnabled) return;
    if (!e.targetTouches || e.targetTouches.length === 0) return;
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    if (!isSwipeEnabled) return;
    if (!e.targetTouches || e.targetTouches.length === 0) return;
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!isSwipeEnabled) return;
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    const currentIdx = seasonOrder.indexOf(season);
    if (currentIdx === -1) return;
    if (isLeftSwipe) {
      const nextIdx = (currentIdx + 1) % seasonOrder.length;
      setSeason(seasonOrder[nextIdx]);
    }
    if (isRightSwipe) {
      const prevIdx = (currentIdx - 1 + seasonOrder.length) % seasonOrder.length;
      setSeason(seasonOrder[prevIdx]);
    }
  };

  const swipeHandlers = isSwipeEnabled
    ? { onTouchStart, onTouchMove, onTouchEnd }
    : {};

  const handleUpdateNow = useCallback(() => {
    if (waitingServiceWorker.current) {
      waitingServiceWorker.current.postMessage({ type: 'SKIP_WAITING' });
      setFeedbackMessage('Aplicando actualización...');
    } else {
      window.location.reload();
    }
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('Usuario aceptó instalar la PWA');
      }
    } catch (error) {
      console.error('Error al mostrar prompt de instalación:', error);
    } finally {
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    }
  };

  const handleDismissInstall = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('installPromptDismissed', 'true');
  };

  return (
    <ErrorBoundary>
      <div className={`min-h-screen ${isDarkMode ? 'bg-slate-900' : 'bg-gray-50'} transition-colors duration-200`}>
        <div className="max-w-4xl mx-auto p-4 pb-8">
          {feedbackMessage && (
            <div className={`fixed top-4 right-4 ${isDarkMode ? 'bg-slate-800' : 'bg-white'} px-6 py-3 rounded-lg shadow-lg z-50 border ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <p className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-medium`}>{feedbackMessage}</p>
            </div>
          )}

          {isUpdateAvailable && (
            <div className={`fixed bottom-4 left-4 right-4 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border rounded-2xl shadow-2xl z-50 p-4 flex flex-col sm:flex-row items-center gap-3`}>
              <div className="flex items-center gap-2">
                <Sparkle className={`w-6 h-6 ${isDarkMode ? 'text-sky-300' : 'text-sky-500'}`} weight="duotone" />
                <div>
                  <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Nueva versión disponible</p>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Actualiza para aplicar los últimos cambios</p>
                </div>
              </div>
              <button
                onClick={handleUpdateNow}
                className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold ${colors.primary} text-white shadow-md hover:shadow-lg transition-all`}
              >
                Actualizar ahora
              </button>
            </div>
          )}

          {showInstallPrompt && colors && seasonEmoji && (
            <div className={`fixed bottom-4 left-4 right-4 ${isDarkMode ? 'bg-gradient-to-r from-slate-800 to-slate-900' : 'bg-gradient-to-r from-white to-gray-50'} p-4 rounded-2xl shadow-2xl z-50 border ${isDarkMode ? 'border-slate-700' : 'border-gray-200'} backdrop-blur-sm`}>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl ${colors.primary} flex items-center justify-center flex-shrink-0`}>
                  {season === 'summer' ? (
                    <Sun className="w-6 h-6 text-white" weight="duotone" />
                  ) : season === 'autumn' ? (
                    <Leaf className="w-6 h-6 text-white" weight="duotone" />
                  ) : (
                    <Snowflake className="w-6 h-6 text-white" weight="duotone" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Instalar aplicación</h3>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Accede rápido desde tu pantalla de inicio</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleDismissInstall}
                    className={`px-3 py-2 rounded-xl text-xs font-medium ${isDarkMode ? 'text-gray-400 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'} transition-colors`}
                  >
                    Ahora no
                  </button>
                  <button
                    onClick={handleInstallClick}
                    className={`px-4 py-2 rounded-xl text-xs font-bold ${colors.primary} text-white shadow-md hover:shadow-lg transition-all`}
                  >
                    Instalar
                  </button>
                </div>
              </div>
            </div>
          )}

          {showMenu && (
            <div className="fixed inset-0 bg-black/50 z-40 flex justify-center items-start p-4 pt-8" onClick={() => setShowMenu(false)}>
              <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-6 w-full max-w-sm shadow-2xl`} onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Menú</h3>
                  <button onClick={() => setShowMenu(false)} className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
                    <X className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} weight="bold" />
                  </button>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setScreen(screen === 'main' ? 'admin' : 'main');
                      setShowMenu(false);
                    }}
                    className={`w-full p-4 rounded-xl ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-100 hover:bg-gray-200'} transition-colors flex items-center gap-3`}
                  >
                    <Gear className="w-5 h-5" />
                    <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {screen === 'main' ? 'Configuración' : 'Volver al presupuestador'}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setIsDarkMode(!isDarkMode);
                      setShowMenu(false);
                    }}
                    className={`w-full p-4 rounded-xl ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-100 hover:bg-gray-200'} transition-colors flex items-center gap-3`}
                  >
                    {isDarkMode ? <Sun className="w-5 h-5 text-yellow-400" weight="duotone" /> : <Moon className="w-5 h-5 text-slate-700" weight="duotone" />}
                    <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Modo {isDarkMode ? 'claro' : 'oscuro'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mb-6">
            <div className={`inline-flex gap-1 ${isDarkMode ? 'bg-slate-800/50' : 'bg-gray-100/80'} p-1 rounded-full backdrop-blur-sm`}>
              {[
                { key: 'summer', icon: <Sun className="w-5 h-5" weight="duotone" /> },
                { key: 'autumn', icon: <Leaf className="w-5 h-5" weight="duotone" /> },
                { key: 'winter', icon: <Snowflake className="w-5 h-5" weight="duotone" /> },
              ].map(({ key, icon }) => {
                const isActive = season === key;
                const activeStyles = `${seasonalColors[key].primary} text-white shadow-md`;
                const idleStyles = `${isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'} scale-95 hover:scale-100`;
                return (
                  <button
                    key={key}
                    onClick={() => setSeason(key)}
                    className={`px-3.5 py-1.5 rounded-full transition-all duration-200 ${isActive ? activeStyles : idleStyles}`}
                  >
                    {icon}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowMenu(true)}
              className={`p-2.5 rounded-full ${isDarkMode ? 'bg-slate-800/50 hover:bg-slate-700/50' : 'bg-gray-100/80 hover:bg-gray-200/80'} backdrop-blur-sm transition-all duration-200`}
            >
              <Gear className={`w-4.5 h-4.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} weight="duotone" />
            </button>
          </div>

          {screen === 'main' ? (
            <div {...swipeHandlers}>
              <MainScreen
                isDarkMode={isDarkMode}
                season={season}
                seasonEmoji={seasonEmoji}
                colors={colors}
                seasonalColors={seasonalColors}
                pricePerNight={pricePerNight}
                setPricePerNight={setPricePerNight}
                setManualPriceEdited={setManualPriceEdited}
                numberOfNights={numberOfNights}
                setNumberOfNights={setNumberOfNights}
                numberOfPeople={numberOfPeople}
                setNumberOfPeople={setNumberOfPeople}
                discount={discount}
                setDiscount={setDiscount}
                setManualDiscountEdited={setManualDiscountEdited}
                discountOptions={discountOptions}
                summerPaymentPlan={summerPaymentPlan}
                setSummerPaymentPlan={setSummerPaymentPlan}
                autumnPaymentPlan={autumnPaymentPlan}
                setAutumnPaymentPlan={setAutumnPaymentPlan}
                winterPaymentPlan={winterPaymentPlan}
                setWinterPaymentPlan={setWinterPaymentPlan}
                canCalculate={canCalculate}
                onCalculate={onCalculate}
                onClear={onClear}
                computed={computed}
                formatARS={formatARS}
                onCopyToClipboard={onCopyToClipboard}
                onShare={onShare}
                getSummaryText={getSummaryText}
                setFeedbackMessage={setFeedbackMessage}
                resumenRef={resumenRef}
                numberOfMassages={numberOfMassages}
                setNumberOfMassages={setNumberOfMassages}
                discount={discount}
              />
            </div>
          ) : (
            <AdminScreen
              isDarkMode={isDarkMode}
              season={season}
              setSeason={setSeason}
              colors={colors}
              seasonalColors={seasonalColors}
              activeTariffs={activeTariffs}
              overrides={overrides}
              setOverrides={setOverrides}
              saveOverrides={saveOverrides}
              isSwipeEnabled={isSwipeEnabled}
              setIsSwipeEnabled={setIsSwipeEnabled}
              massagePriceCents={massagePriceCents}
              setMassagePriceCents={setMassagePriceCents}
            />
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}

function MainScreen({
  isDarkMode, season, seasonEmoji, colors, seasonalColors, pricePerNight, setPricePerNight,
  setManualPriceEdited, numberOfNights, setNumberOfNights, numberOfPeople,
  setNumberOfPeople, discount, setDiscount, setManualDiscountEdited,
  discountOptions, summerPaymentPlan, setSummerPaymentPlan, autumnPaymentPlan, setAutumnPaymentPlan,
  winterPaymentPlan, setWinterPaymentPlan, canCalculate,
  onCalculate, onClear, computed, formatARS, onCopyToClipboard, onShare,
  getSummaryText, setFeedbackMessage, resumenRef,
  numberOfMassages, setNumberOfMassages
}) {
  const peopleInputRef = useRef(null);
  const nightsInputRef = useRef(null);

  const handleClear = () => {
    onClear();
    setTimeout(() => {
      if (peopleInputRef.current) {
        peopleInputRef.current.focus();
      }
    }, 50);
  };

  return (
    <div className="space-y-6">
      {/* ── Formulario ─────────────────────────────────────────── */}
      <div className={`rounded-[2rem] shadow-2xl overflow-hidden border ${isDarkMode ? 'border-slate-800 bg-[#1e293b]' : 'border-gray-200 bg-white'} px-6 py-8`}>
        <div className="space-y-8">

          {/* Huéspedes */}
          <div className="space-y-2">
            <label className={`block text-base font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>Cantidad de huéspedes</label>
            <input
              ref={peopleInputRef}
              type="number"
              inputMode="numeric"
              value={numberOfPeople}
              onChange={(e) => {
                setNumberOfPeople(e.target.value);
                if (e.target.value.length > 0) {
                  setTimeout(() => { if (nightsInputRef.current) nightsInputRef.current.focus(); }, 1500);
                }
              }}
              className={`w-full text-xl font-bold bg-transparent border-0 border-b ${isDarkMode ? 'border-slate-700 text-white' : 'border-gray-200 text-gray-900'} focus:outline-none focus:ring-0 pb-2`}
            />
          </div>

          {/* Noches */}
          <div className="space-y-2">
            <label className={`block text-base font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>Cantidad de noches</label>
            <input
              ref={nightsInputRef}
              type="number"
              inputMode="numeric"
              value={numberOfNights}
              onChange={(e) => {
                setNumberOfNights(e.target.value);
                if (e.target.value.length > 0) {
                  setTimeout(() => e.target.blur(), 1500);
                }
              }}
              className={`w-full text-xl font-bold bg-transparent border-0 border-b ${isDarkMode ? 'border-slate-700 text-white' : 'border-gray-200 text-gray-900'} focus:outline-none focus:ring-0 pb-2`}
            />
          </div>

          {/* Precio por noche */}
          <div className="space-y-2">
            <label className={`block text-base font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>Precio por noche (ARS)</label>
            <input
              type="text"
              inputMode="numeric"
              value={pricePerNight}
              onChange={(e) => { setPricePerNight(e.target.value); setManualPriceEdited(true); }}
              className={`w-full text-xl font-bold bg-transparent border-0 border-b ${isDarkMode ? 'border-slate-700 text-white' : 'border-gray-200 text-gray-900'} focus:outline-none focus:ring-0 pb-2`}
            />
          </div>

          {/* Descuento - Botones tipo pastilla */}
          <div className="flex gap-3">
            {discountOptions.map(opt => (
              <button
                key={opt.label}
                onClick={() => {
                  const newVal = discount === opt.value ? 0 : opt.value;
                  setDiscount(newVal);
                  setManualDiscountEdited(true);
                }}
                className={`flex-1 py-4 rounded-xl text-base font-bold transition-all duration-200 border ${discount === opt.value
                  ? `border-transparent ${colors.primary} text-white`
                  : (isDarkMode ? 'bg-slate-800/50 border-slate-700/60 text-slate-400' : 'bg-gray-50 border-gray-100 text-gray-500')
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Masajes - Stepper UX */}
          <div className="space-y-3">
            <label className={`block text-base font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>Masajes</label>
            <div className="flex gap-2">
              <button
                onClick={() => setNumberOfMassages(0)}
                className={`flex-1 py-4 rounded-xl text-base font-bold transition-all duration-200 border ${numberOfMassages === 0
                  ? `border-transparent ${colors.primary} text-white shadow-md`
                  : (isDarkMode ? 'bg-slate-800/50 border-slate-700/60 text-slate-400' : 'bg-gray-50 border-gray-100 text-gray-500')
                  }`}
              >
                Sin masajes
              </button>

              <div className={`flex-[1.4] flex rounded-xl border overflow-hidden transition-all duration-200 ${numberOfMassages > 0
                ? `border-transparent ${colors.primary} shadow-md`
                : (isDarkMode ? 'bg-slate-800/50 border-slate-700/60' : 'bg-gray-50 border-gray-100')
                }`}>
                {numberOfMassages === 0 ? (
                  <button
                    onClick={() => setNumberOfMassages(1)}
                    className={`w-full py-4 text-base font-bold transition-colors ${isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-gray-500 hover:bg-gray-100'}`}
                  >
                    Sumar masajes
                  </button>
                ) : (
                  <div className="flex items-center w-full h-full">
                    <button
                      onClick={() => setNumberOfMassages(prev => Math.max(0, prev - 1))}
                      className="w-12 h-12 flex items-center justify-center text-white text-2xl font-light hover:bg-black/10 active:scale-90 transition-all border-none outline-none"
                    >
                      −
                    </button>
                    <div className="flex-1 flex flex-col items-center justify-center leading-none select-none">
                      <span className="text-white font-black text-lg">{numberOfMassages}</span>
                      <span className="text-[9px] text-white/80 font-bold uppercase tracking-tighter">
                        {numberOfMassages === 1 ? 'masaje' : 'masajes'}
                      </span>
                    </div>
                    <button
                      onClick={() => setNumberOfMassages(prev => prev + 1)}
                      className="w-12 h-12 flex items-center justify-center text-white text-2xl font-light hover:bg-black/10 active:scale-90 transition-all border-none outline-none"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modalidad de pago */}
          {(['summer', 'autumn', 'winter'].includes(season)) && (() => {
            const currentPlan = season === 'summer' ? summerPaymentPlan : season === 'autumn' ? autumnPaymentPlan : winterPaymentPlan;
            const setPlan = season === 'summer' ? setSummerPaymentPlan : season === 'autumn' ? setAutumnPaymentPlan : setWinterPaymentPlan;
            return (
              <div className="space-y-4">
                <label className={`block text-base font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>Modalidad de pago</label>
                <div className="flex gap-3">
                  {[{ val: '3', label: '3 pagos' }, { val: '2', label: '2 pagos' }].map(({ val, label }) => (
                    <button
                      key={val}
                      onClick={() => setPlan(val)}
                      className={`flex-1 py-4 rounded-xl text-base font-bold transition-all duration-200 border ${currentPlan === val
                        ? `border-transparent ${colors.primary} text-white`
                        : (isDarkMode ? 'bg-slate-800/50 border-slate-700/60 text-slate-400' : 'bg-gray-50 border-gray-100 text-gray-500')
                        }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Botones de acción */}
          <div className="flex gap-3 pt-6">
            <button
              onClick={handleClear}
              className={`flex-1 py-4 rounded-xl text-base font-bold transition-all duration-200 border ${isDarkMode ? 'bg-slate-800/50 border-slate-700/60 text-slate-400' : 'bg-gray-50 border-gray-100 text-gray-500'}`}
            >
              Limpiar
            </button>
            <button
              onClick={onCalculate}
              disabled={!canCalculate}
              className={`flex-1 py-4 rounded-xl text-base font-black transition-all duration-200 ${canCalculate
                ? `${colors.primary} text-white shadow-lg`
                : (isDarkMode ? 'bg-slate-700/30 text-slate-600' : 'bg-gray-100 text-gray-300')
                }`}
            >
              Calcular
            </button>
          </div>
        </div>
      </div>

      {computed && (
        <div ref={resumenRef} className="mt-4 space-y-3">

          {/* ── Hero Total Card ───────────────────────────── */}
          <div className={`rounded-2xl overflow-hidden shadow-md relative ${isDarkMode
            ? 'bg-slate-800 border border-slate-700/60'
            : 'bg-white border border-gray-100'
            }`}>
            {/* Borde izquierdo de acento — único toque de color */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${colors.primary}`} />

            <div className="px-5 pt-5 pb-4 pl-6">
              <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1.5 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'
                }`}>Total Estadía</p>
              <div className="flex items-end justify-between gap-3">
                <p className={`text-4xl font-black tracking-tight ${colors.text}`}>
                  {formatARS(computed.totalFinal)}
                </p>
                {discount > 0 && (
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mb-0.5 flex-shrink-0 ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-500'
                    }`}>
                    {discount * 100}% Off aloj.
                  </span>
                )}
              </div>
            </div>

            {/* Desglose interno — visible solo para el operador */}
            <div className={`mx-5 mb-4 ml-6 rounded-xl px-3.5 py-3 space-y-2 ${isDarkMode ? 'bg-slate-900/50' : 'bg-gray-50'
              }`}>
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'
                }`}>Detalle interno</p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🏠</span>
                  <div>
                    <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Alojamiento {computed.massages > 0 && '(con masajes)'}
                    </p>
                    <p className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                      {formatARS(computed.distributedPricePerNight)} × {computed.nights} noche{computed.nights > 1 ? 's' : ''}
                      {discount > 0 && computed.massages === 0 && ` − ${discount * 100}%`}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-bold tabular-nums ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  {formatARS(computed.totalFinal)}
                </span>
              </div>
            </div>
          </div>

          {/* ── Pagos ───────────────────────────────────────────── */}
          <div className={`rounded-2xl overflow-hidden shadow-sm ${isDarkMode
            ? 'bg-slate-800/60 border border-slate-700/60'
            : 'bg-white border border-gray-100'
            }`}>
            <div className={`px-5 py-3 border-b ${isDarkMode ? 'border-slate-700/40' : 'border-gray-100'}`}>
              <p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>Plan de pagos</p>
            </div>

            <div className="divide-y divide-dashed" style={{ borderColor: isDarkMode ? 'rgba(100,116,139,0.2)' : 'rgba(0,0,0,0.05)' }}>

              {/* Seña */}
              <div className="flex items-center gap-4 px-5 py-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-black text-xs ${isDarkMode ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                  }`}>1</div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Seña</p>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>50% · Reserva confirmada</p>
                </div>
                <span className={`text-base font-black tabular-nums ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatARS(computed.sena)}</span>
              </div>

              {/* Segundo Pago */}
              {computed.segundo > 0 && (
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-black text-xs ${isDarkMode ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>2</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Antes del ingreso</p>
                    <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>30% · Previo al check-in</p>
                  </div>
                  <span className={`text-base font-black tabular-nums ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatARS(computed.segundo)}</span>
                </div>
              )}

              {/* Saldo Final */}
              <div className="flex items-center gap-4 px-5 py-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-black text-xs ${isDarkMode ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>{computed.segundo > 0 ? 3 : 2}</div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Al llegar</p>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>50% · Efectivo al check-in</p>
                </div>
                <span className={`text-base font-black tabular-nums ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatARS(computed.saldo)}</span>
              </div>
            </div>
          </div>

          {/* ── Botones de acción ───────────────────────────────── */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onShare}
              className={`flex-1 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 border-2 flex items-center justify-center gap-2 ${isDarkMode
                ? 'bg-slate-800 text-white border-slate-700 hover:bg-slate-700'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                } shadow-sm`}
            >
              <ShareNetwork className="w-4 h-4" weight="duotone" />
              Compartir
            </button>
            <button
              onClick={async () => {
                try {
                  const text = getSummaryText();
                  await navigator.clipboard.writeText(text);
                  setFeedbackMessage('¡Presupuesto copiado!');
                  setTimeout(() => setFeedbackMessage(''), 2000);
                } catch (error) {
                  console.error("Error al copiar:", error);
                  setFeedbackMessage("Error al copiar");
                  setTimeout(() => setFeedbackMessage(''), 2000);
                }
              }}
              className={`flex-1 py-3.5 rounded-2xl font-black text-sm transition-all duration-200 ${colors.primary} text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2`}
            >
              <Copy className="w-4 h-4" weight="duotone" />
              Copiar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


function AdminScreen({
  isDarkMode, season, setSeason, colors, seasonalColors, activeTariffs,
  overrides, setOverrides, saveOverrides, isSwipeEnabled, setIsSwipeEnabled,
  massagePriceCents, setMassagePriceCents
}) {
  return (
    <div className="space-y-5">
      <div className={`flex items-center gap-3 mb-6`}>
        <div className={`w-10 h-10 rounded-xl ${colors.primary} flex items-center justify-center`}>
          <Gear className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Configuración
          </h1>
          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Gestiona tarifas y descuentos
          </p>
        </div>
      </div>

      <div className={`${isDarkMode ? 'bg-slate-800/50' : 'bg-white/80'} backdrop-blur-sm rounded-2xl p-6 shadow-lg border ${isDarkMode ? 'border-slate-700/50' : 'border-gray-200/50'} relative overflow-hidden`}>
        <div className={`absolute top-0 left-0 w-1 h-full ${colors.primary}`}></div>
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Cambiar temporada deslizando
            </p>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Activa el gesto para alternar la temporada con el pulgar
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isSwipeEnabled}
            onClick={() => setIsSwipeEnabled(prev => !prev)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold tracking-tight transition-all duration-200 ${isSwipeEnabled
              ? (isDarkMode
                ? 'bg-emerald-500/10 border-emerald-400/60 text-emerald-100 shadow-[0_8px_20px_rgba(16,185,129,0.15)]'
                : 'bg-emerald-500/10 border-emerald-400 text-emerald-700 shadow-[0_8px_20px_rgba(16,185,129,0.15)]')
              : (isDarkMode
                ? 'bg-slate-800/40 border-slate-700 text-slate-300'
                : 'bg-gray-100 border-gray-300 text-gray-600')
              }`}
          >
            <Sparkle className={`w-4 h-4 ${isSwipeEnabled ? 'text-emerald-400' : 'text-gray-400'}`} weight="duotone" />
            {/* <span>{isSwipeEnabled ? 'Gestos activados' : 'Gestos desactivados'}</span> */}
          </button>
        </div>

        {/* Separador */}
        <div className={`h-px w-full my-6 ${isDarkMode ? 'bg-slate-700/50' : 'bg-gray-100'}`}></div>

        {/* Valor de masajes */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${colors.accent} flex items-center justify-center`}>
              <CreditCard className="w-5 h-5" weight="duotone" />
            </div>
            <div>
              <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Valor de masajes</h3>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Precio por sesión</p>
            </div>
          </div>
          <div className="relative w-32">
            <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>$</span>
            <input
              type="number"
              value={Math.round(massagePriceCents / 100)}
              onChange={(e) => setMassagePriceCents(parseInt(e.target.value) * 100 || 0)}
              className={`w-full pl-7 pr-3 py-2 bg-transparent border-0 border-b-2 ${isDarkMode ? 'border-slate-600 text-white focus:border-slate-400' : 'border-gray-200 text-gray-900 focus:border-gray-400'} font-bold text-right transition-all duration-200 focus:outline-none focus:ring-0`}
            />
          </div>
        </div>

        {/* Separador */}
        <div className={`h-px w-full my-6 ${isDarkMode ? 'bg-slate-700/50' : 'bg-gray-100'}`}></div>

        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl ${colors.accent} flex items-center justify-center`}>
            <Users className="w-5 h-5" weight="duotone" />
          </div>
          <div>
            <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Tarifas por huéspedes</h3>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Precio por noche según capacidad</p>
          </div>
        </div>

        <div className="space-y-3 mt-5">
          {(overrides[season]?.peopleBands || activeTariffs.peopleBands || []).map((b, idx) => (
            <div key={idx} className={`group p-4 rounded-xl ${isDarkMode ? 'bg-slate-900/50 hover:bg-slate-900/70' : 'bg-gray-50 hover:bg-gray-100'} border ${isDarkMode ? 'border-slate-700/50' : 'border-gray-200'} transition-all duration-200`}>
              <div className="flex gap-3 items-start">
                <div className="flex-1 min-w-0">
                  <div className="grid grid-cols-[1fr_1.4fr] gap-3 mb-3 items-end">
                    <div>
                      <label className={`block text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Personas
                      </label>
                      <input
                        type="number"
                        value={b.people}
                        onChange={(e) => {
                          const n = parseInt(e.target.value) || 0;
                          const next = JSON.parse(JSON.stringify(overrides));
                          const list = next[season]?.peopleBands ? next[season].peopleBands : JSON.parse(JSON.stringify(activeTariffs.peopleBands));
                          list[idx] = { ...list[idx], people: n };
                          next[season] = { ...(next[season] || {}), peopleBands: list };
                          setOverrides(next);
                        }}
                        className={`w-full px-2 py-2.5 bg-transparent border-0 border-b-2 ${isDarkMode ? 'border-slate-600 text-white focus:border-slate-400 focus:bg-slate-800/30' : 'border-gray-300 text-gray-900 focus:border-gray-500 focus:bg-gray-50'} font-bold text-center text-lg transition-all duration-200 focus:outline-none focus:ring-0`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Precio/Noche
                      </label>
                      <div className={`relative w-full`}>
                        <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>$</span>
                        <input
                          type="number"
                          value={b.pricePerNight || 0}
                          onChange={(e) => {
                            const n = parseInt(e.target.value) || 0;
                            const next = JSON.parse(JSON.stringify(overrides));
                            const list = next[season]?.peopleBands ? next[season].peopleBands : JSON.parse(JSON.stringify(activeTariffs.peopleBands));
                            list[idx] = { ...list[idx], pricePerNight: n };
                            next[season] = { ...(next[season] || {}), peopleBands: list };
                            setOverrides(next);
                          }}
                          className={`w-full px-6 py-2.5 bg-transparent border-0 border-b-2 ${isDarkMode ? 'border-slate-600 text-white focus:border-slate-400 focus:bg-slate-800/30' : 'border-gray-300 text-gray-900 focus:border-gray-500 focus:bg-gray-50'} font-semibold text-center text-lg transition-all duration-200 focus:outline-none focus:ring-0`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const next = JSON.parse(JSON.stringify(overrides));
                    const list = next[season]?.peopleBands ? next[season].peopleBands : JSON.parse(JSON.stringify(activeTariffs.peopleBands));
                    list.splice(idx, 1);
                    next[season] = { ...(next[season] || {}), peopleBands: list };
                    setOverrides(next);
                  }}
                  className={`p-2.5 rounded-xl ${isDarkMode ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400' : 'bg-red-50 hover:bg-red-100 text-red-600'} transition-all duration-200 opacity-0 group-hover:opacity-100`}
                >
                  <Trash className="w-4.5 h-4.5" weight="duotone" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => {
            const next = JSON.parse(JSON.stringify(overrides));
            const list = next[season]?.peopleBands ? next[season].peopleBands : JSON.parse(JSON.stringify(activeTariffs.peopleBands));
            list.push({ people: 1, pricePerNight: 0 });
            next[season] = { ...(next[season] || {}), peopleBands: list };
            setOverrides(next);
          }}
          className={`w-full mt-4 py-3 rounded-xl border-2 ${isDarkMode ? 'border-dashed border-slate-600 hover:border-slate-500 hover:bg-slate-800/50' : 'border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50'} ${colors.text} font-medium transition-all duration-200 flex items-center justify-center gap-2`}
        >
          <Plus className="w-4.5 h-4.5" weight="bold" />
          <span className="text-sm">Agregar tarifa</span>
        </button>
      </div>

      <div className={`${isDarkMode ? 'bg-slate-800/50' : 'bg-white/80'} backdrop-blur-sm rounded-2xl p-6 shadow-lg border ${isDarkMode ? 'border-slate-700/50' : 'border-gray-200/50'} relative overflow-hidden`}>
        <div className={`absolute top-0 left-0 w-1 h-full ${colors.primary}`}></div>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl ${colors.accent} flex items-center justify-center`}>
            <Percent className="w-5 h-5" weight="duotone" />
          </div>
          <div>
            <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Descuentos por estadía</h3>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Descuentos automáticos por noches</p>
          </div>
        </div>

        <div className="space-y-3 mt-5">
          {(overrides[season]?.longStayDiscounts || activeTariffs.longStayDiscounts || []).map((d, idx) => (
            <div key={idx} className={`group p-4 rounded-xl ${isDarkMode ? 'bg-slate-900/50 hover:bg-slate-900/70' : 'bg-gray-50 hover:bg-gray-100'} border ${isDarkMode ? 'border-slate-700/50' : 'border-gray-200'} transition-all duration-200`}>
              <div className="flex gap-3 items-center">
                <div className="flex-1">
                  <label className={`block text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Mín. noches
                  </label>
                  <input
                    type="number"
                    value={d.minNights}
                    onChange={(e) => {
                      const n = parseInt(e.target.value) || 0;
                      const next = JSON.parse(JSON.stringify(overrides));
                      const list = next[season]?.longStayDiscounts ? next[season].longStayDiscounts : JSON.parse(JSON.stringify(activeTariffs.longStayDiscounts || []));
                      list[idx] = { ...list[idx], minNights: n };
                      next[season] = { ...(next[season] || {}), longStayDiscounts: list };
                      setOverrides(next);
                    }}
                    className={`w-full px-2 py-2.5 bg-transparent border-0 border-b-2 ${isDarkMode ? 'border-slate-600 text-white focus:border-slate-400 focus:bg-slate-800/30' : 'border-gray-300 text-gray-900 focus:border-gray-500 focus:bg-gray-50'} font-semibold transition-all duration-200 focus:outline-none focus:ring-0`}
                  />
                </div>
                <div className="flex-1">
                  <label className={`block text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Descuento %
                  </label>
                  <input
                    type="number"
                    value={d.discountPercent}
                    onChange={(e) => {
                      const n = parseInt(e.target.value) || 0;
                      const next = JSON.parse(JSON.stringify(overrides));
                      const list = next[season]?.longStayDiscounts ? next[season].longStayDiscounts : JSON.parse(JSON.stringify(activeTariffs.longStayDiscounts || []));
                      list[idx] = { ...list[idx], discountPercent: n };
                      next[season] = { ...(next[season] || {}), longStayDiscounts: list };
                      setOverrides(next);
                    }}
                    className={`w-full px-2 py-2.5 bg-transparent border-0 border-b-2 ${isDarkMode ? 'border-slate-600 text-white focus:border-slate-400 focus:bg-slate-800/30' : 'border-gray-300 text-gray-900 focus:border-gray-500 focus:bg-gray-50'} font-semibold transition-all duration-200 focus:outline-none focus:ring-0`}
                  />
                </div>
                <button
                  onClick={() => {
                    const next = JSON.parse(JSON.stringify(overrides));
                    const list = next[season]?.longStayDiscounts ? next[season].longStayDiscounts : JSON.parse(JSON.stringify(activeTariffs.longStayDiscounts || []));
                    list.splice(idx, 1);
                    next[season] = { ...(next[season] || {}), longStayDiscounts: list };
                    setOverrides(next);
                  }}
                  className={`p-2.5 rounded-xl ${isDarkMode ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400' : 'bg-red-50 hover:bg-red-100 text-red-600'} transition-all duration-200 opacity-0 group-hover:opacity-100`}
                >
                  <Trash className="w-4.5 h-4.5" weight="duotone" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => {
            const next = JSON.parse(JSON.stringify(overrides));
            const list = next[season]?.longStayDiscounts ? next[season].longStayDiscounts : JSON.parse(JSON.stringify(activeTariffs.longStayDiscounts || []));
            list.push({ minNights: 0, discountPercent: 0 });
            next[season] = { ...(next[season] || {}), longStayDiscounts: list };
            setOverrides(next);
          }}
          className={`w-full mt-4 py-3 rounded-xl border-2 ${isDarkMode ? 'border-dashed border-slate-600 hover:border-slate-500 hover:bg-slate-800/50' : 'border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50'} ${colors.text} font-medium transition-all duration-200 flex items-center justify-center gap-2`}
        >
          <Plus className="w-4.5 h-4.5" weight="bold" />
          <span className="text-sm">Agregar descuento</span>
        </button>
      </div>

      <div className="sticky bottom-4 z-10 px-6">
        <button
          onClick={() => saveOverrides(overrides)}
          className={`w-full py-4 rounded-2xl ${colors.primary} text-white font-bold text-base hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-xl flex items-center justify-center gap-2`}
        >
          <Gear className="w-5 h-5" weight="duotone" />
          Guardar cambios
        </button>
      </div>
    </div>
  );
}

export default App
