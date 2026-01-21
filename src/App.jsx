import { useState, useEffect, useMemo, Component } from 'react'
import { Sun, Moon, Settings, Copy, Share2, X, Trash2, Plus } from 'lucide-react'
import tariffsSummer from './data/tariffs.summer.json'
import tariffsAutumn from './data/tariffs.autumn.json'

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
  const [summerPaymentPlan, setSummerPaymentPlan] = useState('3');
  const [autumnPaymentPlan, setAutumnPaymentPlan] = useState('3');
  const [computed, setComputed] = useState(null);
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
  const [overrides, setOverrides] = useState({ summer: null, autumn: null });
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  const seasonalColors = {
    summer: {
      primary: isDarkMode ? 'bg-yellow-400' : 'bg-yellow-500',
      secondary: isDarkMode ? 'bg-yellow-300' : 'bg-yellow-400',
      accent: isDarkMode ? 'bg-yellow-900/30' : 'bg-yellow-50',
      border: isDarkMode ? 'border-yellow-600' : 'border-yellow-300',
      text: isDarkMode ? 'text-yellow-400' : 'text-yellow-600',
    },
    autumn: {
      primary: isDarkMode ? 'bg-orange-400' : 'bg-orange-500',
      secondary: isDarkMode ? 'bg-orange-300' : 'bg-orange-400',
      accent: isDarkMode ? 'bg-orange-900/30' : 'bg-orange-50',
      border: isDarkMode ? 'border-orange-600' : 'border-orange-300',
      text: isDarkMode ? 'text-orange-400' : 'text-orange-600',
    },
  };

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
    const base = season === 'autumn' ? tariffsAutumn : tariffsSummer;
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
        setOverrides(parsed || { summer: null, autumn: null });
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
    if (computed && canCalculate) {
      onCalculate();
    }
  }, [discount, summerPaymentPlan, autumnPaymentPlan]);

  const saveOverrides = (newOverrides) => {
    try {
      localStorage.setItem('tariffOverrides', JSON.stringify(newOverrides));
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
    if (season === 'summer' || season === 'autumn') {
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

      const totalCents = pricePerNightCents * nights;
      const totalWithDiscount = Math.round(totalCents * (1 - discount));
      
      let sena, segundo, saldo;
      
      if (season === 'autumn') {
        if (autumnPaymentPlan === '2') {
          sena = Math.round(totalWithDiscount * 0.5);
          segundo = 0;
          saldo = totalWithDiscount - sena;
        } else {
          sena = Math.round(totalWithDiscount * 0.2);
          segundo = Math.round(totalWithDiscount * 0.3);
          saldo = totalWithDiscount - sena - segundo;
        }
      } else {
        if (summerPaymentPlan === '2') {
          sena = Math.round(totalWithDiscount * 0.5);
          segundo = 0;
          saldo = totalWithDiscount - sena;
        } else {
          sena = Math.round(totalWithDiscount * 0.2);
          segundo = Math.round(totalWithDiscount * 0.3);
          saldo = totalWithDiscount - sena - segundo;
        }
      }

      setComputed({
        totalOriginal: totalCents,
        totalWithDiscount,
        sena,
        segundo,
        saldo,
        nights,
        pricePerNightCents,
        season,
        summerPaymentPlan,
        autumnPaymentPlan
      });
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
    setSummerPaymentPlan('3');
    setAutumnPaymentPlan('3');
    setComputed(null);
    setManualPriceEdited(false);
    setManualDiscountEdited(false);
  };

  const getSummaryText = () => {
    if (!computed) return '';
    
    const formatValue = (valueInCents) => {
      const pesos = Math.round(valueInCents / 100);
      return `$${pesos.toLocaleString('es-AR')}`;
    };
    
    let totalSection = '';
    if (discount === 0) {
      totalSection = `✅ *Total ${formatValue(computed.totalOriginal)}*`;
    } else {
      totalSection = `✅ *Total ${formatValue(computed.totalOriginal)}*
*Descuento ${discount * 100}%: -${formatValue(computed.totalOriginal - computed.totalWithDiscount)}*
*Total final: ${formatValue(computed.totalWithDiscount)}*`;
    }
    
    const seasonEmoji = computed.season === 'autumn' ? '🍂' : '🏖️';
    
    if (computed.season === 'autumn') {
      if (computed.autumnPaymentPlan === '2') {
        return `${seasonEmoji} Su Presupuesto\n\n✅ Precio por noche ${formatValue(computed.pricePerNightCents)}\nX ${computed.nights} noche${computed.nights > 1 ? 's' : ''}\n\n${totalSection}\n\n📍1° pago 50% (Seña)\n\n*${formatValue(computed.sena)}*\n\n📍2° pago 50%. Al llegar en efectivo \n\n*${formatValue(computed.saldo)}*\n\n(Por mail enviamos la confirmación de la reserva junto a la factura correspondiente)`;
      }
      return `${seasonEmoji} Su Presupuesto\n\n✅ Precio por noche ${formatValue(computed.pricePerNightCents)}\nX ${computed.nights} noche${computed.nights > 1 ? 's' : ''}\n\n${totalSection}\n\n📍1° pago 20%\n\n*${formatValue(computed.sena)}*\n\n📍2° pago 30% (Debe abonarse antes de la fecha de ingreso) \n\n*${formatValue(computed.segundo)}*\n\n📍3° pago 50%. Al llegar en efectivo \n\n*${formatValue(computed.saldo)}*\n\n(Por mail enviamos la confirmación de la reserva junto a la factura correspondiente)`;
    } else {
      if (computed.summerPaymentPlan === '2') {
        return `${seasonEmoji} Su Presupuesto\n\n✅ Precio por noche ${formatValue(computed.pricePerNightCents)}\nX ${computed.nights} noche${computed.nights > 1 ? 's' : ''}\n\n${totalSection}\n\n📍1° pago 50% (Seña)\n\n*${formatValue(computed.sena)}*\n\n📍2° pago 50%. Al llegar en efectivo \n\n*${formatValue(computed.saldo)}*\n\n(Por mail enviamos la confirmación de la reserva junto a la factura correspondiente)`;
      }
      return `${seasonEmoji} Su Presupuesto\n\n✅ Precio por noche ${formatValue(computed.pricePerNightCents)}\nX ${computed.nights} noche${computed.nights > 1 ? 's' : ''}\n\n${totalSection}\n\n📍1° pago 20%\n\n*${formatValue(computed.sena)}*\n\n📍2° pago 30% (Debe abonarse antes de la fecha de ingreso) \n\n*${formatValue(computed.segundo)}*\n\n📍3° pago 50%. Al llegar en efectivo \n\n*${formatValue(computed.saldo)}*\n\n(Por mail enviamos la confirmación de la reserva junto a la factura correspondiente)`;
    }
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
      const text = getSummaryText();
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        setFeedbackMessage("Resumen copiado al portapapeles");
      }
      setTimeout(() => setFeedbackMessage(''), 2000);
    } catch (error) {
      console.error("Error al compartir:", error);
    }
  };

  const seasonEmoji = season === 'summer' ? '🏖️' : '🍂';
  const colors = seasonalColors[season];

  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    if (!e.targetTouches || e.targetTouches.length === 0) return;
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    if (!e.targetTouches || e.targetTouches.length === 0) return;
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      setSeason(season === 'summer' ? 'autumn' : 'summer');
    }
    if (isRightSwipe) {
      setSeason(season === 'autumn' ? 'summer' : 'autumn');
    }
  };

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

        {showInstallPrompt && colors && seasonEmoji && (
          <div className={`fixed bottom-4 left-4 right-4 ${isDarkMode ? 'bg-gradient-to-r from-slate-800 to-slate-900' : 'bg-gradient-to-r from-white to-gray-50'} p-4 rounded-2xl shadow-2xl z-50 border ${isDarkMode ? 'border-slate-700' : 'border-gray-200'} backdrop-blur-sm`}>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl ${colors.primary} flex items-center justify-center flex-shrink-0`}>
                <span className="text-2xl">{seasonEmoji}</span>
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
          <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={() => setShowMenu(false)}>
            <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-6 max-w-sm w-full shadow-2xl`} onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Menú</h3>
                <button onClick={() => setShowMenu(false)} className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
                  <X className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
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
                  <Settings className={`w-5 h-5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`} />
                  <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {screen === 'main' ? 'Configuración' : 'Volver al calculador'}
                  </span>
                </button>
                <button
                  onClick={() => {
                    setIsDarkMode(!isDarkMode);
                    setShowMenu(false);
                  }}
                  className={`w-full p-4 rounded-xl ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-100 hover:bg-gray-200'} transition-colors flex items-center gap-3`}
                >
                  {isDarkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
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
            <button
              onClick={() => setSeason('summer')}
              className={`px-3.5 py-1.5 rounded-full transition-all duration-200 ${season === 'summer' ? `${colors.primary} text-white shadow-sm scale-100` : `${isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'} scale-95 hover:scale-100`}`}
            >
              <span className="text-lg">🏖️</span>
            </button>
            <button
              onClick={() => setSeason('autumn')}
              className={`px-3.5 py-1.5 rounded-full transition-all duration-200 ${season === 'autumn' ? `${seasonalColors.autumn.primary} text-white shadow-sm scale-100` : `${isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'} scale-95 hover:scale-100`}`}
            >
              <span className="text-lg">🍂</span>
            </button>
          </div>
          <button
            onClick={() => setShowMenu(true)}
            className={`p-2.5 rounded-full ${isDarkMode ? 'bg-slate-800/50 hover:bg-slate-700/50' : 'bg-gray-100/80 hover:bg-gray-200/80'} backdrop-blur-sm transition-all duration-200`}
          >
            <Settings className={`w-4.5 h-4.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          </button>
        </div>

        {screen === 'main' ? (
          <div
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
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
            canCalculate={canCalculate}
            onCalculate={onCalculate}
            onClear={onClear}
            computed={computed}
            formatARS={formatARS}
            onCopyToClipboard={onCopyToClipboard}
            onShare={onShare}
            getSummaryText={getSummaryText}
            setFeedbackMessage={setFeedbackMessage}
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
  discountOptions, summerPaymentPlan, setSummerPaymentPlan, autumnPaymentPlan, setAutumnPaymentPlan, canCalculate,
  onCalculate, onClear, computed, formatARS, onCopyToClipboard, onShare,
  getSummaryText, setFeedbackMessage
}) {
  return (
    <div className="space-y-6">
      <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-4 shadow-lg border ${colors.border}`}>
        <div className="space-y-4">
          <div>
            <label className={`block text-base mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Cantidad de huéspedes
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={numberOfPeople}
              onChange={(e) => setNumberOfPeople(e.target.value)}
              placeholder=""
              className={`w-full px-3.5 py-3.5 rounded-xl border ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:outline-none text-lg mb-4`}
            />
          </div>

          <div>
            <label className={`block text-base mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Cantidad de noches
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={numberOfNights}
              onChange={(e) => setNumberOfNights(e.target.value)}
              placeholder=""
              className={`w-full px-3.5 py-3.5 rounded-xl border ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:outline-none text-lg mb-4`}
            />
          </div>

          <div>
            <label className={`block text-base mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Precio por noche (ARS)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={pricePerNight}
              onChange={(e) => {
                setPricePerNight(e.target.value);
                setManualPriceEdited(true);
              }}
              placeholder=""
              className={`w-full px-3.5 py-3.5 rounded-xl border ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:outline-none text-lg mb-4`}
            />
          </div>

          <div className="flex gap-2.5 mb-4">
            {discountOptions.map(opt => (
              <button
                key={opt.label}
                onClick={() => {
                  const newVal = discount === opt.value ? 0 : opt.value;
                  setDiscount(newVal);
                  setManualDiscountEdited(true);
                }}
                className={`flex-1 py-2.5 rounded-xl font-semibold transition-all border ${
                  discount === opt.value 
                    ? `${colors.primary} ${colors.border} text-white shadow-md` 
                    : `${isDarkMode ? 'bg-slate-800' : 'bg-white'} ${colors.border} hover:opacity-80 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {(season === 'summer' || season === 'autumn') && (
            <div>
              <label className={`block text-base mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Modalidad de pago
              </label>
              <div className="flex gap-2.5 mb-4">
                <button
                  onClick={() => season === 'summer' ? setSummerPaymentPlan('3') : setAutumnPaymentPlan('3')}
                  className={`flex-1 py-2.5 rounded-xl font-semibold transition-all border ${(season === 'summer' ? summerPaymentPlan : autumnPaymentPlan) === '3' ? `${colors.primary} ${colors.border} text-white` : `${isDarkMode ? 'bg-slate-800' : 'bg-white'} ${colors.border} ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}`}
                >
                  3 pagos
                </button>
                <button
                  onClick={() => season === 'summer' ? setSummerPaymentPlan('2') : setAutumnPaymentPlan('2')}
                  className={`flex-1 py-2.5 rounded-xl font-semibold transition-all border ${(season === 'summer' ? summerPaymentPlan : autumnPaymentPlan) === '2' ? `${colors.primary} ${colors.border} text-white` : `${isDarkMode ? 'bg-slate-800' : 'bg-white'} ${colors.border} ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}`}
                >
                  2 pagos
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onCalculate}
              disabled={!canCalculate}
              className={`flex-1 py-3 rounded-xl font-bold text-base transition-all ${canCalculate ? `${colors.primary} text-white` : `${isDarkMode ? 'bg-slate-700 text-gray-500' : 'bg-gray-200 text-gray-400'} cursor-not-allowed`}`}
            >
              Calcular
            </button>
            <button
              onClick={onClear}
              className={`flex-1 py-3 rounded-xl font-bold text-base border transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-gray-300' : 'bg-white border-gray-300 text-gray-700'}`}
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {computed && (
        <div className="mt-5">
          <h2 className={`text-lg font-bold mb-2.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Resumen
          </h2>

          <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl p-3 shadow-sm border-l-4 ${isDarkMode ? 'border-yellow-500' : 'border-yellow-400'} mb-2.5`}>
            <div className="flex justify-between items-center">
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {formatARS(computed.pricePerNightCents)} × {computed.nights} noche{computed.nights > 1 ? 's' : ''}
              </p>
              {discount === 0 && (
                <button
                  onClick={() => onCopyToClipboard(computed.totalOriginal, 'Total')}
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-slate-900/50' : 'bg-gray-100'} hover:opacity-80 transition-opacity`}
                >
                  <span className="text-base">📋</span>
                </button>
              )}
            </div>
            <p className={`text-xl font-extrabold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Total: {formatARS(computed.totalOriginal)}
            </p>
          </div>

          {discount > 0 && (
            <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl p-3 shadow-sm border-l-4 ${isDarkMode ? 'border-slate-500' : 'border-gray-400'} mb-2.5`}>
              <div className="flex justify-between items-center">
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Total con descuento ({discount * 100}%)
                </p>
                <button
                  onClick={() => onCopyToClipboard(computed.totalWithDiscount, 'Total con descuento')}
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-slate-900/50' : 'bg-gray-100'} hover:opacity-80 transition-opacity`}
                >
                  <span className="text-base">📋</span>
                </button>
              </div>
              <p className={`text-xl font-extrabold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {formatARS(computed.totalWithDiscount)}
              </p>
            </div>
          )}

          <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl p-3 shadow-sm border-l-4 ${season === 'summer' ? (isDarkMode ? 'border-yellow-500' : 'border-yellow-400') : (isDarkMode ? 'border-orange-500' : 'border-orange-400')} mb-2.5`}>
            <div className="flex justify-between items-center">
              <p className={`text-sm ${colors.text}`}>
                Seña ({computed.season === 'summer' ? (computed.summerPaymentPlan === '2' ? '50%' : '20%') : (computed.autumnPaymentPlan === '2' ? '50%' : '20%')})
              </p>
              <button
                onClick={() => onCopyToClipboard(computed.sena, 'Seña')}
                className={`w-8 h-8 rounded-full flex items-center justify-center ${colors.accent} hover:opacity-80 transition-opacity`}
              >
                <span className="text-base">📋</span>
              </button>
            </div>
            <p className={`text-xl font-extrabold mt-1 ${colors.text}`}>
              {formatARS(computed.sena)}
            </p>
          </div>

          {computed.segundo > 0 && (
            <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl p-3 shadow-sm border-l-4 ${season === 'summer' ? (isDarkMode ? 'border-yellow-400' : 'border-yellow-300') : (isDarkMode ? 'border-orange-400' : 'border-orange-300')} mb-2.5`}>
              <div className="flex justify-between items-center">
                <p className={`text-sm ${seasonalColors[season].text}`}>
                  Segundo pago (30%)
                </p>
                <button
                  onClick={() => onCopyToClipboard(computed.segundo, 'Segundo pago')}
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${colors.accent} hover:opacity-80 transition-opacity`}
                >
                  <span className="text-base">📋</span>
                </button>
              </div>
              <p className={`text-xl font-extrabold mt-1 ${seasonalColors[season].text}`}>
                {formatARS(computed.segundo)}
              </p>
            </div>
          )}

          <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl p-3 shadow-sm border-l-4 ${isDarkMode ? 'border-red-500' : 'border-red-400'} mb-2.5`}>
            <div className="flex justify-between items-center">
              <p className={`text-sm ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                {computed.season === 'summer' ? (computed.summerPaymentPlan === '2' ? 'Segundo pago (50%)' : 'Saldo final (50%)') : (computed.autumnPaymentPlan === '2' ? 'Segundo pago (50%)' : 'Saldo final (50%)')}
              </p>
              <button
                onClick={() => onCopyToClipboard(computed.saldo, computed.season === 'summer' ? (computed.summerPaymentPlan === '2' ? 'Segundo pago' : 'Saldo final') : 'Segundo pago')}
                className={`w-8 h-8 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-red-900/30' : 'bg-red-50'} hover:opacity-80 transition-opacity`}
              >
                <span className="text-base">📋</span>
              </button>
            </div>
            <p className={`text-xl font-extrabold mt-1 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
              {formatARS(computed.saldo)}
            </p>
          </div>

          <div className="flex gap-3 mt-2">
            <button
              onClick={onShare}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${isDarkMode ? 'bg-slate-800 text-white border border-slate-700' : 'bg-white text-gray-900 border border-gray-300'}`}
            >
              Compartir todo
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
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${colors.primary} text-white`}
            >
              Copiar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


function AdminScreen({ isDarkMode, season, setSeason, colors, seasonalColors, activeTariffs, overrides, setOverrides, saveOverrides }) {
  return (
    <div className="space-y-5">
      <div className={`flex items-center gap-3 mb-6`}>
        <div className={`w-10 h-10 rounded-xl ${colors.primary} flex items-center justify-center`}>
          <Settings className="w-5 h-5 text-white" />
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
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl ${colors.accent} flex items-center justify-center`}>
            <span className="text-xl">👥</span>
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
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className={`block text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        👤 Personas
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
                        className={`w-full px-3 py-2.5 rounded-xl ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white focus:border-slate-600' : 'bg-white border-gray-300 text-gray-900 focus:border-gray-400'} border-2 font-bold text-center text-lg ${colors.text} transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 ${isDarkMode ? 'focus:ring-slate-600' : 'focus:ring-gray-300'}`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        💰 Precio/Noche
                      </label>
                      <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-300'} border-2`}>
                        <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>$</span>
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
                          className={`flex-1 min-w-0 bg-transparent ${isDarkMode ? 'text-white' : 'text-gray-900'} font-semibold text-base focus:outline-none`}
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
                  <Trash2 className="w-4.5 h-4.5" />
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
          <Plus className="w-4.5 h-4.5" />
          <span className="text-sm">Agregar tarifa</span>
        </button>
      </div>

      <div className={`${isDarkMode ? 'bg-slate-800/50' : 'bg-white/80'} backdrop-blur-sm rounded-2xl p-6 shadow-lg border ${isDarkMode ? 'border-slate-700/50' : 'border-gray-200/50'} relative overflow-hidden`}>
        <div className={`absolute top-0 left-0 w-1 h-full ${colors.primary}`}></div>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl ${colors.accent} flex items-center justify-center`}>
            <span className="text-xl">🎯</span>
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
                    className={`w-full px-3 py-2.5 rounded-xl ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300 text-gray-900'} border-2 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 ${isDarkMode ? 'focus:ring-slate-600' : 'focus:ring-gray-300'}`}
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
                    className={`w-full px-3 py-2.5 rounded-xl ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300 text-gray-900'} border-2 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 ${isDarkMode ? 'focus:ring-slate-600' : 'focus:ring-gray-300'}`}
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
                  <Trash2 className="w-4.5 h-4.5" />
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
          <Plus className="w-4.5 h-4.5" />
          <span className="text-sm">Agregar descuento</span>
        </button>
      </div>

      <div className="sticky bottom-4 z-10">
        <button
          onClick={() => saveOverrides(overrides)}
          className={`w-full py-4 rounded-2xl ${colors.primary} text-white font-bold text-base hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-xl flex items-center justify-center gap-2`}
        >
          <Settings className="w-5 h-5" />
          Guardar cambios
        </button>
      </div>
    </div>
  );
}

export default App
