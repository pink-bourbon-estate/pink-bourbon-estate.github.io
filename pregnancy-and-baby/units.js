/* units.js - the unit switcher for Pregnancy and Baby.

   Everything is stored in one unit only (kilograms, centimetres, millilitres, mmol/L and degrees Celsius), so changing units
   never changes your saved numbers: it only changes what you see and type. Three presets (Metric UK, Imperial UK, US) and a
   choice for each kind of unit. */
(() => {
  'use strict';
  const LB_PER_KG = 2.2046226, CM_PER_IN = 2.54, ML_UK_FLOZ = 28.41306, ML_US_FLOZ = 29.57353, MGDL_PER_MMOL = 18.016;
  const r = (x, d = 1) => { const f = 10 ** d; return Math.round(x * f) / f; };

  const PRESETS = {
    'Metric (UK)': { weight: 'kg', length: 'cm', volume: 'ml', glucose: 'mmol', temp: 'C' },
    'Imperial (UK)': { weight: 'stlb', length: 'in', volume: 'ukfloz', glucose: 'mmol', temp: 'C' },
    'US': { weight: 'lb', length: 'in', volume: 'usfloz', glucose: 'mgdl', temp: 'F' },
  };
  const CHOICES = {
    weight: [['kg', 'kilograms'], ['stlb', 'stone and pounds'], ['lb', 'pounds']],
    length: [['cm', 'centimetres'], ['in', 'inches']],
    volume: [['ml', 'millilitres'], ['ukfloz', 'UK fluid ounces'], ['usfloz', 'US fluid ounces']],
    glucose: [['mmol', 'mmol/L'], ['mgdl', 'mg/dL']],
    temp: [['C', '°C'], ['F', '°F']],
  };
  const LABELS = { weight: 'Weight', length: 'Length', volume: 'Volume', glucose: 'Blood glucose', temp: 'Temperature' };

  /** A units object u = {weight, length, volume, glucose, temp}. All functions take and return metric on the "storage" side. */
  const U = {
    PRESETS, CHOICES, LABELS,
    defaults: () => ({ ...PRESETS['Metric (UK)'] }),
    presetName: (u) => Object.keys(PRESETS).find((k) => Object.keys(u).every((x) => PRESETS[k][x] === u[x])) || 'Custom',

    /* weight (kg). Stone and pounds need two boxes, so weightParts says how many to show. */
    weightFields: (u) => (u.weight === 'stlb' ? [{ label: 'stone', step: 1 }, { label: 'pounds', step: 0.1 }] : [{ label: u.weight === 'lb' ? 'pounds' : 'kg', step: 0.1 }]),
    weightFmt: (u, kg) => { if (kg == null || kg === '' || isNaN(kg)) return ''; if (u.weight === 'kg') return r(kg) + ' kg'; const lb = kg * LB_PER_KG; if (u.weight === 'lb') return r(lb) + ' lb'; const st = Math.floor(lb / 14 + 1e-9); return st + ' st ' + r(lb - st * 14) + ' lb'; },
    /** From the box values (1 or 2 numbers, or '' ) to kg, or null. */
    weightFrom: (u, a, b) => { const x = a === '' || a == null ? NaN : Number(a); if (isNaN(x)) return null; if (u.weight === 'kg') return x; if (u.weight === 'lb') return x / LB_PER_KG; return (x * 14 + (Number(b) || 0)) / LB_PER_KG; },
    /** A change in weight (no stone): "+1.2 kg" / "+2.6 lb". */
    weightChange: (u, kg) => (kg >= 0 ? '+' : '-') + (u.weight === 'kg' ? r(Math.abs(kg)) + ' kg' : r(Math.abs(kg) * LB_PER_KG) + ' lb'),
    /** Baby weights read better in grams or pounds and ounces. */
    babyWeightFmt: (u, kg) => { if (kg == null || isNaN(kg)) return ''; if (u.weight === 'kg') return kg < 1 ? Math.round(kg * 1000) + ' g' : r(kg, 2) + ' kg'; const oz = kg * LB_PER_KG * 16, lb = Math.floor(oz / 16 + 1e-9); return lb + ' lb ' + r(oz - lb * 16) + ' oz'; },
    babyWeightFields: (u) => (u.weight === 'kg' ? [{ label: 'kg', step: 0.001 }] : [{ label: 'pounds', step: 1 }, { label: 'ounces', step: 0.1 }]),
    babyWeightFrom: (u, a, b) => { const x = a === '' || a == null ? NaN : Number(a); if (isNaN(x)) return null; if (u.weight === 'kg') return x; return (x * 16 + (Number(b) || 0)) / 16 / LB_PER_KG; },

    /* length (cm) */
    lengthSuffix: (u) => (u.length === 'in' ? 'in' : 'cm'),
    lengthFmt: (u, cm) => (cm == null || cm === '' || isNaN(cm) ? '' : u.length === 'in' ? r(cm / CM_PER_IN) + ' in' : r(cm) + ' cm'),
    lengthShow: (u, cm) => (cm == null || cm === '' ? '' : u.length === 'in' ? r(cm / CM_PER_IN) : r(cm)),
    lengthFrom: (u, v) => { const x = v === '' || v == null ? NaN : Number(v); return isNaN(x) ? null : u.length === 'in' ? x * CM_PER_IN : x; },
    heightFmt: (u, cm) => { if (!cm) return ''; if (u.length === 'cm') return r(cm, 0) + ' cm'; const inch = Math.round(cm / CM_PER_IN); return Math.floor(inch / 12) + ' ft ' + (inch % 12) + ' in'; },

    /* volume (ml) */
    volumeSuffix: (u) => (u.volume === 'ukfloz' || u.volume === 'usfloz' ? 'fl oz' : 'ml'),
    volumeFmt: (u, ml) => (ml == null || ml === '' || isNaN(ml) ? '' : u.volume === 'ml' ? Math.round(ml) + ' ml' : r(ml / (u.volume === 'ukfloz' ? ML_UK_FLOZ : ML_US_FLOZ)) + (u.volume === 'ukfloz' ? ' UK fl oz' : ' US fl oz')),
    volumeFrom: (u, v) => { const x = v === '' || v == null ? NaN : Number(v); return isNaN(x) ? null : u.volume === 'ml' ? x : x * (u.volume === 'ukfloz' ? ML_UK_FLOZ : ML_US_FLOZ); },

    /* glucose (mmol/L) */
    glucoseSuffix: (u) => (u.glucose === 'mgdl' ? 'mg/dL' : 'mmol/L'),
    glucoseFmt: (u, m) => (m == null || m === '' || isNaN(m) ? '' : u.glucose === 'mgdl' ? Math.round(m * MGDL_PER_MMOL) + ' mg/dL' : r(m) + ' mmol/L'),
    glucoseShow: (u, m) => (m == null || m === '' ? '' : u.glucose === 'mgdl' ? Math.round(m * MGDL_PER_MMOL) : r(m)),
    glucoseFrom: (u, v) => { const x = v === '' || v == null ? NaN : Number(v); return isNaN(x) ? null : u.glucose === 'mgdl' ? x / MGDL_PER_MMOL : x; },

    /* temperature (°C) */
    tempSuffix: (u) => (u.temp === 'F' ? '°F' : '°C'),
    tempShow: (u, c) => (c == null || c === '' ? '' : u.temp === 'F' ? r(c * 9 / 5 + 32) : r(c)),
    tempFmt: (u, c) => (c == null || c === '' || isNaN(c) ? '' : U.tempShow(u, c) + (u.temp === 'F' ? ' °F' : ' °C')),
    tempFrom: (u, v) => { const x = v === '' || v == null ? NaN : Number(v); return isNaN(x) ? null : u.temp === 'F' ? (x - 32) * 5 / 9 : x; },
  };
  window.PBunits = U;
})();
