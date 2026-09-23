export const formatDate = (ts) => new Date(ts).toLocaleString('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
});

export const truncate = (str, len = 40) => str?.length > len ? str.slice(0, len) + '...' : str;

export const cn = (...classes) => classes.filter(Boolean).join(' ');

export const parsePinCount = (pinTable) => pinTable?.length || 8;

export const getPinsPerSide = (totalPins) => Math.ceil(totalPins / 2);