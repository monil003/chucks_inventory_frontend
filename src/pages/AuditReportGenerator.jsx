import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Calendar, Upload, Plus, Trash2, Edit2, Check, X, ShieldAlert, Sparkles, RefreshCw, Clipboard, FileText, Search } from 'lucide-react';
import InventoryCalendar from '../components/InventoryCalendar';

function getDatesInRange(startDateStr, endDateStr) {
  const dates = [];
  if (!startDateStr || !endDateStr) return dates;
  let curr = new Date(startDateStr);
  const end = new Date(endDateStr);
  while (curr <= end) {
    dates.push(curr.toISOString().split('T')[0]);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

export default function AuditReportGenerator({ sessions = [], rawItems, recipes, onRefreshAll }) {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [startingCounts, setStartingCounts] = useState({});
  const [loadingStartingCounts, setLoadingStartingCounts] = useState(false);
  const [startingCountsMessage, setStartingCountsMessage] = useState('');
  const [isPeriodCountsModalOpen, setIsPeriodCountsModalOpen] = useState(false);

  // Local state for deliveries (Invoice items)
  const [deliveries, setDeliveries] = useState([]);
  
  // Local state for sales data
  const [salesData, setSalesData] = useState([]);
  const [salesFileName, setSalesFileName] = useState('');

  // Local state for ending counts (Stock count)
  const [endingCounts, setEndingCounts] = useState({});
  const [endingBoxesInput, setEndingBoxesInput] = useState({});
  const [endingLooseInput, setEndingLooseInput] = useState({});
  const [loadingEndingCounts, setLoadingEndingCounts] = useState(false);
  const [endingCountsMessage, setEndingCountsMessage] = useState('');

  // Gemini extraction states
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [extractedInvoiceItems, setExtractedInvoiceItems] = useState([]);
  const [invoiceDate, setInvoiceDate] = useState('');
  const [parsingInvoice, setParsingInvoice] = useState(false);

  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);
  const [extractedSalesItems, setExtractedSalesItems] = useState([]);
  const [parsingSales, setParsingSales] = useState(false);

  // General error/success
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generating, setGenerating] = useState(false);

  // Generated Report Results state
  const [generatedReport, setGeneratedReport] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');

  // Edit Modals state
  const [isEditDeliveriesModalOpen, setIsEditDeliveriesModalOpen] = useState(false);
  const [editDeliveriesSearch, setEditDeliveriesSearch] = useState('');
  const [editDeliveriesSelectedId, setEditDeliveriesSelectedId] = useState('');

  const [isEditSalesModalOpen, setIsEditSalesModalOpen] = useState(false);
  const [editSalesSearch, setEditSalesSearch] = useState('');

  // Main Tab Navigation state
  const [activeMainTab, setActiveMainTab] = useState('report'); // 'report' | 'deliveries' | 'sales'

  // Manage state
  const [manageDateMode, setManageDateMode] = useState('single'); // 'single' | 'range'
  const [manageDate, setManageDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [manageStartDate, setManageStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [manageEndDate, setManageEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [manageRangeClickTarget, setManageRangeClickTarget] = useState('start'); // 'start' | 'end'

  const [manageDeliveries, setManageDeliveries] = useState([]);
  const [manageSales, setManageSales] = useState([]);
  const [manageSalesFileName, setManageSalesFileName] = useState('');
  const [loadingManageData, setLoadingManageData] = useState(false);
  const [searchManageDeliveries, setSearchManageDeliveries] = useState('');
  const [searchManageSales, setSearchManageSales] = useState('');

  // New entries states
  const [newDeliveryRawItemId, setNewDeliveryRawItemId] = useState('');
  const [newDeliveryQuantity, setNewDeliveryQuantity] = useState('');
  const [newDeliveryPrice, setNewDeliveryPrice] = useState('');
  const [newDeliveryDate, setNewDeliveryDate] = useState('');
  const [newDeliveryBoxes, setNewDeliveryBoxes] = useState('');
  const [newDeliveryPieces, setNewDeliveryPieces] = useState('');

  const [newSalesSku, setNewSalesSku] = useState('');
  const [newSalesQuantitySold, setNewSalesQuantitySold] = useState('');
  const [newSalesPrice, setNewSalesPrice] = useState('');
  const [newSalesDate, setNewSalesDate] = useState('');

  // Load starting counts when startDate or endDate changes
  const fetchStartingCounts = async () => {
    if (!startDate || !endDate) return;
    setLoadingStartingCounts(true);
    setStartingCountsMessage('');
    try {
      const startD = new Date(startDate);
      startD.setUTCHours(0,0,0,0);
      const endD = new Date(endDate);
      endD.setUTCHours(0,0,0,0);

      const targetSessions = sessions.filter(sess => {
        if (!sess.date) return false;
        const d = new Date(sess.date);
        d.setUTCHours(0,0,0,0);
        if (endD > startD) {
          return d >= startD && d < endD;
        } else {
          return d.getTime() === startD.getTime();
        }
      });

      const counts = {};
      rawItems.forEach(item => {
        counts[item._id] = 0;
      });

      if (targetSessions.length > 0) {
        targetSessions.forEach(sess => {
          const inventoryToUse = sess.actualFinalInventory && sess.actualFinalInventory.length > 0
            ? sess.actualFinalInventory 
            : sess.initialInventory;
          
          if (inventoryToUse) {
            inventoryToUse.forEach(item => {
              if (!item.rawItemId) return;
              const id = item.rawItemId._id || item.rawItemId;
              if (id && counts[id.toString()] !== undefined) {
                counts[id.toString()] += item.quantity || 0;
              }
            });
          }
        });

        const activeDates = targetSessions.map(sess => {
          return new Date(sess.date).toISOString().split('T')[0];
        }).sort();

        setStartingCounts(counts);
        setStartingCountsMessage(`Found inventory count records logged on: ${activeDates.join(', ')}. Starting count successfully loaded.`);
      } else {
        setStartingCounts(counts);
        setStartingCountsMessage(`No inventory session found between ${startDate} and before ${endDate}. Starting stock counts will default to 0.`);
      }
    } catch (err) {
      console.error(err);
      setStartingCountsMessage('Error reading starting counts from database.');
    } finally {
      setLoadingStartingCounts(false);
    }
  };

  // Load ending counts when endDate changes
  const fetchEndingCounts = async () => {
    if (!endDate) return;
    setLoadingEndingCounts(true);
    setEndingCountsMessage('');
    try {
      const sess = await api.getSessionByDate(endDate);
      const counts = {};
      const boxes = {};
      const loose = {};
      rawItems.forEach(item => {
        counts[item._id] = 0;
        boxes[item._id] = '';
        loose[item._id] = '';
      });

      if (sess) {
        const hasFinal = sess.actualFinalInventory && sess.actualFinalInventory.some(i => i.quantity > 0);
        const hasInitial = sess.initialInventory && sess.initialInventory.some(i => i.quantity > 0);
        const inventoryToUse = hasFinal ? sess.actualFinalInventory : (hasInitial ? sess.initialInventory : null);

        if (inventoryToUse) {
          inventoryToUse.forEach(item => {
            if (!item.rawItemId) return;
            const id = item.rawItemId._id || item.rawItemId;
            const qty = item.quantity;
            counts[id] = qty;

            const rItem = rawItems.find(r => r._id === id.toString());
            if (rItem && rItem.quantityPerBox > 0) {
              const b = Math.floor(qty / rItem.quantityPerBox);
              const l = qty % rItem.quantityPerBox;
              boxes[id] = b === 0 ? '' : String(b);
              loose[id] = l === 0 ? '' : String(l);
            } else if (rItem) {
              boxes[id] = '';
              loose[id] = qty === 0 ? '' : String(qty);
            }
          });
          setEndingCounts(counts);
          setEndingBoxesInput(boxes);
          setEndingLooseInput(loose);
          setEndingCountsMessage(`Found inventory count record logged on ${endDate}. Closing counts pre-filled.`);
        } else {
          setEndingCounts(counts);
          setEndingBoxesInput(boxes);
          setEndingLooseInput(loose);
          setEndingCountsMessage(`No counts logged on ${endDate}. Inputs initialized to 0.`);
        }
      } else {
        setEndingCounts(counts);
        setEndingBoxesInput(boxes);
        setEndingLooseInput(loose);
        setEndingCountsMessage(`No inventory session found on ${endDate}. Inputs initialized to 0.`);
      }
    } catch (err) {
      console.error(err);
      setEndingCountsMessage('Error reading closing counts from database.');
    } finally {
      setLoadingEndingCounts(false);
    }
  };

  useEffect(() => {
    fetchStartingCounts();
  }, [startDate, endDate, rawItems, sessions]);

  useEffect(() => {
    fetchEndingCounts();
  }, [endDate, rawItems]);

  const isRangeSession = (sess) => {
    if (sess.startDate && sess.endDate) {
      const sD = new Date(sess.startDate).toISOString().split('T')[0];
      const eD = new Date(sess.endDate).toISOString().split('T')[0];
      return sD !== eD;
    }
    return false;
  };

  const fetchDeliveriesForRange = () => {
    if (!startDate || !endDate) return;
    try {
      const startD = new Date(startDate);
      startD.setUTCHours(0,0,0,0);
      const endD = new Date(endDate);
      endD.setUTCHours(0,0,0,0);

      // Find all sessions in range
      const sessionsInRange = sessions.filter(sess => {
        if (!sess.date) return false;
        const d = new Date(sess.date);
        d.setUTCHours(0,0,0,0);
        return d >= startD && d <= endD;
      });

      const loadedDeliveries = [];
      sessionsInRange.forEach(sess => {
        // Skip range sessions to avoid aggregate double-counting
        if (isRangeSession(sess)) return;

        const dStr = new Date(sess.date).toISOString().split('T')[0];
        (sess.deliveries || []).forEach(d => {
          const rawId = d.rawItemId?._id || d.rawItemId;
          const rItem = rawItems.find(r => r._id === rawId?.toString());
          const qty = d.quantity || 0;
          if (qty === 0) return; // Skip zero quantities

          let boxesInput = '';
          let piecesInput = String(qty);
          if (rItem && rItem.quantityPerBox > 0) {
            const b = Math.floor(qty / rItem.quantityPerBox);
            const l = qty % rItem.quantityPerBox;
            boxesInput = b === 0 ? '' : String(b);
            piecesInput = l === 0 ? '' : String(l);
          }
          loadedDeliveries.push({
            rawItemId: rawId?.toString() || '',
            name: rItem ? rItem.name : 'Unknown Ingredient',
            quantity: qty,
            boxesInput,
            piecesInput,
            price: d.price || 0,
            date: dStr
          });
        });
      });

      setDeliveries(loadedDeliveries);
    } catch (err) {
      console.error('Error fetching deliveries for range:', err);
    }
  };

  useEffect(() => {
    fetchDeliveriesForRange();
  }, [startDate, endDate, rawItems, sessions]);

  const fetchManageData = async () => {
    setLoadingManageData(true);
    try {
      if (manageDateMode === 'single') {
        if (!manageDate) return;
        const sess = await api.getSessionByDate(manageDate);
        if (sess) {
          // Map deliveries to matching frontend structure: { rawItemId, name, quantity, price }
          const mappedDeliveries = (sess.deliveries || []).map(d => {
            const rawId = d.rawItemId?._id || d.rawItemId;
            const rItem = rawItems.find(r => r._id === rawId?.toString());
            const qty = d.quantity || 0;
            let boxesInput = '';
            let piecesInput = String(qty);
            if (rItem && rItem.quantityPerBox > 0) {
              const b = Math.floor(qty / rItem.quantityPerBox);
              const l = qty % rItem.quantityPerBox;
              boxesInput = b === 0 ? '' : String(b);
              piecesInput = l === 0 ? '' : String(l);
            }
            return {
              rawItemId: rawId?.toString() || '',
              name: rItem ? rItem.name : 'Unknown Ingredient',
              quantity: qty,
              boxesInput,
              piecesInput,
              price: d.price || 0,
              date: manageDate
            };
          });

          setManageDeliveries(mappedDeliveries);
          setManageSales(sess.salesData || []);
          setManageSalesFileName(sess.salesFile || '');
        } else {
          setManageDeliveries([]);
          setManageSales([]);
          setManageSalesFileName('');
        }
      } else {
        if (!manageStartDate || !manageEndDate) return;
        // Find all sessions in range
        const sessionsInRange = sessions.filter(sess => {
          if (!sess.date) return false;
          const dStr = new Date(sess.date).toISOString().split('T')[0];
          return dStr >= manageStartDate && dStr <= manageEndDate;
        });

        const allDeliveries = [];
        const allSales = [];

        sessionsInRange.forEach(sess => {
          const dStr = new Date(sess.date).toISOString().split('T')[0];
          (sess.deliveries || []).forEach(d => {
            const rawId = d.rawItemId?._id || d.rawItemId;
            const rItem = rawItems.find(r => r._id === rawId?.toString());
            const qty = d.quantity || 0;
            let boxesInput = '';
            let piecesInput = String(qty);
            if (rItem && rItem.quantityPerBox > 0) {
              const b = Math.floor(qty / rItem.quantityPerBox);
              const l = qty % rItem.quantityPerBox;
              boxesInput = b === 0 ? '' : String(b);
              piecesInput = l === 0 ? '' : String(l);
            }
            allDeliveries.push({
              rawItemId: rawId?.toString() || '',
              name: rItem ? rItem.name : 'Unknown Ingredient',
              quantity: qty,
              boxesInput,
              piecesInput,
              price: d.price || 0,
              date: dStr
            });
          });

          (sess.salesData || []).forEach(s => {
            allSales.push({
              sku: s.sku || '',
              name: s.name || '',
              quantitySold: s.quantitySold || 0,
              price: s.price || 0,
              date: dStr
            });
          });
        });

        setManageDeliveries(allDeliveries);
        setManageSales(allSales);
        setManageSalesFileName('Range Combined Data');
      }
    } catch (err) {
      console.error(err);
      setError('Error loading date context data from database.');
    } finally {
      setLoadingManageData(false);
    }
  };

  useEffect(() => {
    if (activeMainTab === 'deliveries' || activeMainTab === 'sales') {
      fetchManageData();
    }
  }, [manageDate, manageStartDate, manageEndDate, manageDateMode, activeMainTab, sessions]);

  const handleManageCalendarDateSelect = (dateStr) => {
    if (manageDateMode === 'single') {
      setManageDate(dateStr);
    } else {
      if (manageRangeClickTarget === 'start') {
        setManageStartDate(dateStr);
        setManageRangeClickTarget('end');
      } else {
        if (dateStr < manageStartDate) {
          setManageStartDate(dateStr);
          setManageRangeClickTarget('end');
        } else {
          setManageEndDate(dateStr);
          setManageRangeClickTarget('start');
        }
      }
    }
  };

  const handleToggleDateMode = (mode) => {
    setManageDateMode(mode);
    if (mode === 'single') {
      if (manageStartDate) {
        setManageDate(manageStartDate);
      }
    } else {
      if (manageDate) {
        setManageStartDate(manageDate);
        setManageEndDate(manageDate);
        setManageRangeClickTarget('start');
      }
    }
  };

  const handleSaveManageDeliveries = async () => {
    setError('');
    setSuccess('');
    try {
      if (manageDateMode === 'single') {
        await api.saveDeliveries(manageDate, manageDeliveries);
        setSuccess(`Deliveries saved successfully for ${manageDate}.`);
      } else {
        // Group manageDeliveries by item.date
        const dateList = [];
        let curr = new Date(manageStartDate);
        const end = new Date(manageEndDate);
        while (curr <= end) {
          dateList.push(curr.toISOString().split('T')[0]);
          curr.setDate(curr.getDate() + 1);
        }

        const grouped = {};
        dateList.forEach(d => {
          grouped[d] = [];
        });

        manageDeliveries.forEach(item => {
          const itemDate = item.date || manageStartDate;
          if (grouped[itemDate]) {
            grouped[itemDate].push({
              rawItemId: item.rawItemId,
              quantity: item.quantity,
              price: item.price
            });
          }
        });

        for (const d of dateList) {
          await api.saveDeliveries(d, grouped[d]);
        }
        setSuccess(`Deliveries saved successfully for range ${manageStartDate} to ${manageEndDate}.`);
      }
      if (onRefreshAll) await onRefreshAll();
    } catch (err) {
      setError(err.message || 'Failed to save deliveries.');
    }
  };

  const handleResetManageDeliveries = async () => {
    const target = manageDateMode === 'single' ? manageDate : `range ${manageStartDate} to ${manageEndDate}`;
    if (!window.confirm(`Are you sure you want to reset all deliveries to 0 for ${target}?`)) return;
    setError('');
    setSuccess('');
    try {
      if (manageDateMode === 'single') {
        await api.saveDeliveries(manageDate, []);
        setManageDeliveries([]);
      } else {
        let curr = new Date(manageStartDate);
        const end = new Date(manageEndDate);
        while (curr <= end) {
          const dStr = curr.toISOString().split('T')[0];
          await api.saveDeliveries(dStr, []);
          curr.setDate(curr.getDate() + 1);
        }
        setManageDeliveries([]);
      }
      setSuccess(`Deliveries reset to 0 for ${target}.`);
      if (onRefreshAll) await onRefreshAll();
    } catch (err) {
      setError(err.message || 'Failed to reset deliveries.');
    }
  };

  const handleSaveManageSales = async () => {
    setError('');
    setSuccess('');
    try {
      if (manageDateMode === 'single') {
        await api.saveSalesData(manageDate, manageSales, manageSalesFileName || 'Manually Entered');
        setSuccess(`Sales data saved successfully for ${manageDate}.`);
      } else {
        const dateList = [];
        let curr = new Date(manageStartDate);
        const end = new Date(manageEndDate);
        while (curr <= end) {
          dateList.push(curr.toISOString().split('T')[0]);
          curr.setDate(curr.getDate() + 1);
        }

        const grouped = {};
        dateList.forEach(d => {
          grouped[d] = [];
        });

        manageSales.forEach(item => {
          const itemDate = item.date || manageStartDate;
          if (grouped[itemDate]) {
            grouped[itemDate].push({
              sku: item.sku,
              name: item.name,
              quantitySold: item.quantitySold,
              price: item.price
            });
          }
        });

        for (const d of dateList) {
          await api.saveSalesData(d, grouped[d], `Range Save ${manageStartDate}_${manageEndDate}`);
        }
        setSuccess(`Sales data saved successfully for range ${manageStartDate} to ${manageEndDate}.`);
      }
      if (onRefreshAll) await onRefreshAll();
    } catch (err) {
      setError(err.message || 'Failed to save sales data.');
    }
  };

  const handleResetManageSales = async () => {
    const target = manageDateMode === 'single' ? manageDate : `range ${manageStartDate} to ${manageEndDate}`;
    if (!window.confirm(`Are you sure you want to reset all sales data to 0 for ${target}?`)) return;
    setError('');
    setSuccess('');
    try {
      if (manageDateMode === 'single') {
        await api.saveSalesData(manageDate, [], 'Reset');
        setManageSales([]);
        setManageSalesFileName('');
      } else {
        let curr = new Date(manageStartDate);
        const end = new Date(manageEndDate);
        while (curr <= end) {
          const dStr = curr.toISOString().split('T')[0];
          await api.saveSalesData(dStr, [], 'Reset');
          curr.setDate(curr.getDate() + 1);
        }
        setManageSales([]);
        setManageSalesFileName('');
      }
      setSuccess(`Sales data reset to 0 for ${target}.`);
      if (onRefreshAll) await onRefreshAll();
    } catch (err) {
      setError(err.message || 'Failed to reset sales data.');
    }
  };

  const handleAddManageDeliveryItem = () => {
    if (!newDeliveryRawItemId) return;
    const rItem = rawItems.find(r => r._id === newDeliveryRawItemId);
    if (!rItem) return;

    const targetDate = manageDateMode === 'single' ? manageDate : (newDeliveryDate || manageStartDate);

    const qtyPerBox = rItem.quantityPerBox || 0;
    let qty = 0;
    let boxesInput = '';
    let piecesInput = '';

    if (qtyPerBox > 0) {
      const boxes = Number(newDeliveryBoxes) || 0;
      const pieces = Number(newDeliveryPieces) || 0;
      qty = (boxes * qtyPerBox) + pieces;
      boxesInput = newDeliveryBoxes;
      piecesInput = newDeliveryPieces;
    } else {
      qty = Number(newDeliveryQuantity) || 0;
      piecesInput = newDeliveryQuantity;
    }

    const newItem = {
      rawItemId: newDeliveryRawItemId,
      name: rItem.name,
      quantity: qty,
      boxesInput,
      piecesInput,
      price: Number(newDeliveryPrice) || 0,
      date: targetDate
    };

    setManageDeliveries(prev => [...prev, newItem]);
    setNewDeliveryRawItemId('');
    setNewDeliveryQuantity('');
    setNewDeliveryBoxes('');
    setNewDeliveryPieces('');
    setNewDeliveryPrice('');
  };

  const handleAddManageSalesItem = () => {
    if (!newSalesSku) return;
    const recipe = recipes.find(r => r.menuItemSku === newSalesSku);
    if (!recipe) return;

    const targetDate = manageDateMode === 'single' ? manageDate : (newSalesDate || manageStartDate);

    const newItem = {
      sku: newSalesSku,
      name: recipe.menuItemName,
      quantitySold: Number(newSalesQuantitySold) || 0,
      price: Number(newSalesPrice) || 0,
      date: targetDate
    };

    setManageSales(prev => [...prev, newItem]);
    setNewSalesSku('');
    setNewSalesQuantitySold('');
    setNewSalesPrice('');
  };

  // Handlers for boxes / loose counts input
  const handleBoxesChange = (itemId, val, qtyPerBox) => {
    setEndingBoxesInput(prev => ({ ...prev, [itemId]: val }));
    const boxQty = Number(val) || 0;
    const looseQty = Number(endingLooseInput[itemId]) || 0;
    const total = (boxQty * qtyPerBox) + looseQty;
    setEndingCounts(prev => ({ ...prev, [itemId]: total }));
  };

  const handleLooseChange = (itemId, val, qtyPerBox) => {
    setEndingLooseInput(prev => ({ ...prev, [itemId]: val }));
    const boxQty = Number(endingBoxesInput[itemId]) || 0;
    const looseQty = Number(val) || 0;
    const total = qtyPerBox > 0 ? (boxQty * qtyPerBox) + looseQty : looseQty;
    setEndingCounts(prev => ({ ...prev, [itemId]: total }));
  };

  const handleUpdateRawItemBoxQty = async (rawItemId, newQtyPerBox) => {
    const rawItem = rawItems.find(r => r._id === rawItemId);
    if (!rawItem) return;
    try {
      await api.updateRawItem(rawItemId, {
        name: rawItem.name,
        unit: rawItem.unit,
        price: rawItem.price,
        quantityPerBox: Number(newQtyPerBox) || 0
      });
      if (onRefreshAll) {
        await onRefreshAll();
      }
    } catch (err) {
      console.error('Failed to update raw item box qty', err);
      setError(err.message || 'Failed to update raw item box quantity configuration.');
    }
  };

  // Upload Invoice handlers
  const handleInvoiceUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setParsingInvoice(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.parseInvoice(formData);
      if (response && Array.isArray(response.deliveries)) {
        const extractedDate = response.invoiceDate || endDate;
        setInvoiceDate(extractedDate);

        const formatted = response.deliveries.map(item => {
          const matchedRaw = rawItems.find(r => r._id === item.rawItemId);
          const qtyPerBox = matchedRaw ? (matchedRaw.quantityPerBox || 0) : 0;
          return {
            ...item,
            receiveAs: 'box',
            boxesInput: String(item.quantity || 0),
            piecesInput: '0',
            quantity: (Number(item.quantity) || 0) * qtyPerBox,
            date: extractedDate
          };
        });
        setExtractedInvoiceItems(formatted);
        setIsInvoiceModalOpen(true);
      } else {
        throw new Error('Gemini failed to extract any delivery items.');
      }
    } catch (err) {
      setError(err.message || 'Invoice extraction failed.');
    } finally {
      setParsingInvoice(false);
      e.target.value = ''; // reset file input
    }
  };

  // Upload Sales Report handlers
  const handleSalesUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setParsingSales(true);
    setError('');
    setSuccess('');
    setSalesFileName(file.name);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.parseSalesReport(formData);
      if (response && Array.isArray(response.sales)) {
        setExtractedSalesItems(response.sales);
        setIsSalesModalOpen(true);
      } else {
        throw new Error('Gemini failed to extract any sales entries.');
      }
    } catch (err) {
      setError(err.message || 'Sales report extraction failed.');
    } finally {
      setParsingSales(false);
      e.target.value = '';
    }
  };

  // Confirm extracted invoice items
  const handleConfirmInvoice = () => {
    const validDeliveries = extractedInvoiceItems
      .filter(item => item.rawItemId && item.quantity > 0)
      .map(item => ({
        rawItemId: item.rawItemId,
        name: rawItems.find(r => r._id === item.rawItemId)?.name || item.name,
        quantity: Number(item.quantity),
        boxesInput: item.boxesInput || '',
        piecesInput: item.piecesInput || String(item.quantity),
        receiveAs: item.receiveAs || 'box',
        price: Number(item.price) || 0,
        date: item.date || invoiceDate || endDate
      }));

    setDeliveries(prev => [...prev, ...validDeliveries]);
    setIsInvoiceModalOpen(false);
    setSuccess(`Successfully added ${validDeliveries.length} invoice items to deliveries.`);
  };

  // Confirm extracted sales items
  const handleConfirmSales = () => {
    const validSales = extractedSalesItems
      .filter(item => item.quantitySold > 0)
      .map(item => ({
        sku: item.sku || 'UNKNOWN',
        name: item.name,
        quantitySold: Number(item.quantitySold),
        price: Number(item.price) || 0
      }));

    setSalesData(validSales);
    setIsSalesModalOpen(false);
    setSuccess(`Loaded ${validSales.length} sales report records.`);
  };

  // Submit the generated interval report
  const handleGenerateReport = async () => {
    setError('');
    setSuccess('');

    if (!startDate || !endDate) {
      setError('Please select both Start and End Dates.');
      return;
    }

    setGenerating(true);
    try {
      // Map endingCounts object to array
      const endingCountsArray = Object.keys(endingCounts).map(id => ({
        rawItemId: id,
        quantity: endingCounts[id] || 0
      }));

      const payload = {
        startDate,
        endDate,
        deliveries,
        endingCounts: endingCountsArray,
        salesData,
        salesFile: salesFileName || 'Gemini AI Extract'
      };

      const report = await api.generateIntervalReport(payload);
      setGeneratedReport(report);
      setSuccess('Interval Audit Report successfully generated!');
      if (onRefreshAll) {
        await onRefreshAll();
      }
    } catch (err) {
      setError(err.message || 'Failed to generate audit report.');
    } finally {
      setGenerating(false);
    }
  };

  const getDeliveriesSum = (itemId) => {
    return deliveries
      .filter(d => d.rawItemId === itemId)
      .reduce((sum, curr) => sum + curr.quantity, 0);
  };

  // Variance statistics for report view
  const auditStats = () => {
    if (!generatedReport || !generatedReport.variance) return { total: 0, losses: 0, overages: 0, perfect: 0, netLoss: 0 };
    let total = generatedReport.variance.length;
    let losses = 0;
    let overages = 0;
    let perfect = 0;
    let netLoss = 0;

    generatedReport.variance.forEach(v => {
      const val = v.varianceValue;
      if (val < -0.05) {
        losses++;
        netLoss += Math.abs(val);
      } else if (val > 0.05) {
        overages++;
      } else {
        perfect++;
      }
    });

    return { total, losses, overages, perfect, netLoss };
  };

  // Filtered ingredients audit rows
  const getFilteredAuditRows = () => {
    if (!generatedReport || !generatedReport.variance) return [];
    return generatedReport.variance.filter(v => {
      const val = v.varianceValue;
      if (activeFilter === 'loss') return val < -0.05;
      if (activeFilter === 'overage') return val > 0.05;
      if (activeFilter === 'ontarget') return Math.abs(val) <= 0.05;
      if (activeFilter === 'variance') return Math.abs(val) > 0.05;
      return true;
    });
  };

  const { total, losses, overages, perfect, netLoss } = auditStats();
  const filteredAuditRows = getFilteredAuditRows();

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Page Title */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Variance Audit Reports</h1>
          <p className="page-subtitle">Configure interval audits, parse invoices, and audit lost vs sold inventory</p>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
        <button
          type="button"
          onClick={() => setActiveMainTab('report')}
          className={`btn ${activeMainTab === 'report' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <Clipboard size={15} /> Run Audit Report
        </button>
        <button
          type="button"
          onClick={() => setActiveMainTab('deliveries')}
          className={`btn ${activeMainTab === 'deliveries' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <Upload size={15} /> Manage Deliveries
        </button>
        <button
          type="button"
          onClick={() => setActiveMainTab('sales')}
          className={`btn ${activeMainTab === 'sales' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <FileText size={15} /> Manage Sales Data
        </button>
      </div>

      {error && (
        <div className="card" style={{ background: 'var(--danger-glow)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', fontSize: '0.9rem', padding: '1rem' }}>
          {error}
        </div>
      )}

      {success && (
        <div className="card" style={{ background: 'var(--success-glow)', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--success)', fontSize: '0.9rem', padding: '1rem' }}>
          {success}
        </div>
      )}

      {activeMainTab === 'report' && (generatedReport ? (
        /* ================= RESULTS VIEW ================= */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0 }}>
            <div>
              <button 
                className="btn btn-secondary" 
                onClick={() => setGeneratedReport(null)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.75rem' }}
              >
                <X size={16} /> Close Report
              </button>
              <h2 className="page-title" style={{ fontSize: '1.5rem' }}>
                Audit Period Results: {new Date(startDate).toLocaleDateString(undefined, { timeZone: 'UTC' })} to {new Date(endDate).toLocaleDateString(undefined, { timeZone: 'UTC' })}
              </h2>
            </div>
          </div>

          {/* Audit Stats Panel */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem' }}>
            <div className="card text-center" style={{ padding: '1.25rem', cursor: 'pointer', border: activeFilter === 'all' ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.04)' }} onClick={() => setActiveFilter('all')}>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{total}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Audited Ingredients</div>
            </div>
            <div className="card text-center" style={{ padding: '1.25rem', cursor: 'pointer', border: activeFilter === 'loss' ? '2px solid var(--danger)' : '1px solid rgba(255,255,255,0.04)' }} onClick={() => setActiveFilter('loss')}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--danger)' }}>{losses}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Loss Count (Shortage)</div>
            </div>
            <div className="card text-center" style={{ padding: '1.25rem', cursor: 'pointer', border: activeFilter === 'overage' ? '2px solid var(--success)' : '1px solid rgba(255,255,255,0.04)' }} onClick={() => setActiveFilter('overage')}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>{overages}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Overage Count</div>
            </div>
            <div className="card text-center" style={{ padding: '1.25rem', cursor: 'pointer', border: activeFilter === 'ontarget' ? '2px solid var(--success)' : '1px solid rgba(255,255,255,0.04)' }} onClick={() => setActiveFilter('ontarget')}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>{perfect}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>On Target</div>
            </div>
            <div className="card text-center" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: netLoss > 0 ? 'var(--danger)' : '#fff' }}>-{netLoss.toFixed(1)}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Net Loss Qty</div>
            </div>
          </div>

          {/* Results Table */}
          <div className="card" style={{ width: '100%' }}>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <button className={`btn ${activeFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => setActiveFilter('all')}>All Items</button>
              <button className={`btn ${activeFilter === 'variance' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => setActiveFilter('variance')}>Discrepancies</button>
              <button className={`btn ${activeFilter === 'loss' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => setActiveFilter('loss')}>Losses</button>
              <button className={`btn ${activeFilter === 'overage' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => setActiveFilter('overage')}>Overages</button>
              <button className={`btn ${activeFilter === 'ontarget' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => setActiveFilter('ontarget')}>On Target</button>
            </div>

            <div className="table-container">
              <table className="custom-table responsive-table">
                <thead>
                  <tr>
                    <th>Ingredient</th>
                    <th>Unit</th>
                    <th style={{ textAlign: 'right' }}>Start Stock</th>
                    <th style={{ textAlign: 'right' }}>Deliveries</th>
                    <th style={{ textAlign: 'right' }}>End Stock</th>
                    <th style={{ textAlign: 'right' }}>Used</th>
                    <th style={{ textAlign: 'right' }}>Sold (Recipe)</th>
                    <th style={{ textAlign: 'center', width: '120px' }}>Lost (Variance)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAuditRows.map(v => {
                    const name = v.rawItemId?.name || 'Unknown';
                    const unit = v.rawItemId?.unit || '';
                    const startVal = v.initial;
                    // Deliveries calculated back
                    const endVal = v.actualFinal;
                    const soldVal = v.usage;
                    const lostVal = v.varianceValue;
                    const deliveryVal = Math.max(0, expectedFinalValueFromRaw(v));
                    const usedVal = (startVal + deliveryVal) - endVal;

                    function expectedFinalValueFromRaw(item) {
                      // Expectation: expectedFinal = start + delivery - sold
                      // Let's resolve deliveries
                      if (!item || !item.rawItemId) return 0;
                      const idStr = (item.rawItemId._id || item.rawItemId).toString();
                      const sessDelivery = generatedReport.deliveries?.find(d => {
                        if (!d || !d.rawItemId) return false;
                        const dId = d.rawItemId._id || d.rawItemId;
                        return dId && dId.toString() === idStr;
                      });
                      return sessDelivery ? sessDelivery.quantity : 0;
                    }

                    return (
                      <tr key={v._id}>
                        <td data-label="Ingredient" style={{ fontWeight: 600 }}>{name}</td>
                        <td data-label="Unit">
                          <span className="badge" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>{unit}</span>
                        </td>
                        <td data-label="Start Stock" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{startVal.toFixed(1)}</td>
                        <td data-label="Deliveries" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{deliveryVal.toFixed(1)}</td>
                        <td data-label="End Stock" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{endVal.toFixed(1)}</td>
                        <td data-label="Used" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{usedVal.toFixed(1)}</td>
                        <td data-label="Sold" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{soldVal.toFixed(1)}</td>
                        <td data-label="Lost" style={{ textAlign: 'center' }}>
                          {lostVal > 0.05 ? (
                            <span className="badge" style={{ background: 'var(--danger-glow)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', fontWeight: 600 }}>
                              +{lostVal.toFixed(1)}
                            </span>
                          ) : lostVal < -0.05 ? (
                            <span className="badge" style={{ background: 'var(--success-glow)', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--success)', fontWeight: 600 }}>
                              {lostVal.toFixed(1)}
                            </span>
                          ) : (
                            <span className="badge" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>0.0</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ================= SETUP / CONFIGURE AUDIT FORM ================= */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Inputs Panel: Dates & Reports */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            
            {/* Step 1: Date Range Setup */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Calendar size={18} style={{ color: 'var(--primary)' }} /> 1. Select Period Dates
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Start Date (Load Starting Inventory)</label>
                  <input
                    type="date"
                    className="input-field"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>End Date (Run Current Audit)</label>
                  <input
                    type="date"
                    className="input-field"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              {loadingStartingCounts ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Searching database starting records...</div>
              ) : (
                <div style={{ fontSize: '0.8rem', padding: '0.6rem 0.8rem', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '0.5rem' }}>
                  {startingCountsMessage}
                </div>
              )}

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsPeriodCountsModalOpen(true)}
                disabled={!startDate || !endDate}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.55rem', width: '100%', borderColor: 'rgba(255,255,255,0.1)', marginTop: '0.5rem' }}
              >
                <Clipboard size={15} style={{ color: 'var(--primary)' }} /> Show Inventory of That Date Range
              </button>
            </div>

            {/* Step 2: Upload Invoices (Deliveries) */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Upload size={18} style={{ color: 'var(--primary)' }} /> 2. Upload Delivery Invoices
              </h3>

              <div 
                className="upload-dropzone" 
                onClick={() => !parsingInvoice && document.getElementById('invoice-input').click()}
                style={{ padding: '1.75rem 1rem', cursor: parsingInvoice ? 'not-allowed' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                {parsingInvoice ? (
                  <>
                    <div style={{ width: '28px', height: '28px', border: '3px solid rgba(249,115,22,0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '0.15rem', color: 'var(--primary)' }}>
                      AI extracting invoice...
                    </h4>
                  </>
                ) : (
                  <>
                    <Upload className="upload-icon" style={{ height: '32px', width: '32px', marginBottom: '0.25rem' }} />
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '0.15rem' }}>
                      Upload Invoice PDF / Image
                    </h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', margin: 0 }}>
                      Parsed by Gemini for quantities and prices
                    </p>
                  </>
                )}
                <input
                  id="invoice-input"
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={handleInvoiceUpload}
                  disabled={parsingInvoice}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Delivery list summary */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Added Deliveries ({deliveries.length})</h4>
                  {deliveries.length > 0 && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setIsEditDeliveriesModalOpen(true)}
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <Edit2 size={12} style={{ color: 'var(--primary)' }} /> Edit
                    </button>
                  )}
                </div>
                {deliveries.length === 0 ? (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>No delivery items added yet.</p>
                ) : (
                  <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {deliveries.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContext: 'space-between', alignItems: 'center', padding: '0.4rem 0.6rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '6px', fontSize: '0.75rem' }}>
                        <div style={{ flex: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontWeight: 500 }}>
                          {item.name} <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginLeft: '0.4rem' }}>({item.date || endDate})</span>
                        </div>
                        <div style={{ marginRight: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>
                          {(() => {
                            const rItem = rawItems.find(r => r._id === item.rawItemId);
                            if (rItem && rItem.quantityPerBox > 0) {
                              const b = Math.floor(item.quantity / rItem.quantityPerBox);
                              const l = item.quantity % rItem.quantityPerBox;
                              return `+${b} box ${l} pcs (${item.quantity} ${rItem.unit})`;
                            }
                            return `+${item.quantity} ${rItem?.unit || 'pcs'}`;
                          })()}
                        </div>
                        <button
                          type="button"
                          onClick={() => setDeliveries(prev => prev.filter((_, i) => i !== idx))}
                          style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0 }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: Sales Report (CSV/Image) */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <FileText size={18} style={{ color: 'var(--primary)' }} /> 3. Sales Report Upload
              </h3>

              <div 
                className="upload-dropzone" 
                onClick={() => !parsingSales && document.getElementById('sales-input').click()}
                style={{ padding: '1.75rem 1rem', cursor: parsingSales ? 'not-allowed' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                {parsingSales ? (
                  <>
                    <div style={{ width: '28px', height: '28px', border: '3px solid rgba(249,115,22,0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '0.15rem', color: 'var(--primary)' }}>
                      AI parsing sales...
                    </h4>
                  </>
                ) : (
                  <>
                    <Upload className="upload-icon" style={{ height: '32px', width: '32px', marginBottom: '0.25rem' }} />
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '0.15rem' }}>
                      Upload Sales Report / POS file
                    </h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', margin: 0 }}>
                      Supports sales CSV, PDF, and image sales reports
                    </p>
                  </>
                )}
                <input
                  id="sales-input"
                  type="file"
                  accept=".csv,application/pdf,image/*"
                  onChange={handleSalesUpload}
                  disabled={parsingSales}
                  style={{ display: 'none' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Loaded Sales Entries ({salesData.length})</h4>
                  {salesData.length > 0 && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setIsEditSalesModalOpen(true)}
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <Edit2 size={12} style={{ color: 'var(--primary)' }} /> Edit
                    </button>
                  )}
                </div>
                {salesData.length === 0 ? (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>No sales reports loaded.</p>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContext: 'space-between', padding: '0.5rem 0.75rem', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '8px', fontSize: '0.75rem', color: 'var(--success)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flex: 1, overflow: 'hidden' }}>
                      <Check size={14} style={{ flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{salesFileName}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSalesData([]); setSalesFileName(''); }}
                      style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0, marginLeft: 'auto' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>


          </div>

          {/* Step 4: Current stock counts (Ending stock count on end date) */}
          <div className="card" style={{ width: '100%' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Clipboard size={18} style={{ color: 'var(--primary)' }} /> 4. Enter Current Counts on {endDate}
            </h3>

            {loadingEndingCounts ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Searching database ending records...</div>
            ) : endingCountsMessage ? (
              <div style={{ fontSize: '0.8rem', padding: '0.6rem 0.8rem', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '1rem' }}>
                {endingCountsMessage}
              </div>
            ) : null}

            <div className="table-container" style={{ maxHeight: '450px', overflowY: 'auto' }}>
              <table className="custom-table responsive-table">
                <thead>
                  <tr>
                    <th>Ingredient</th>
                    <th>Unit</th>
                    <th>Start Stock</th>
                    <th>Deliveries</th>
                    <th>Current stock count</th>
                  </tr>
                </thead>
                <tbody>
                  {rawItems.map(item => {
                    const startQty = startingCounts[item._id] || 0;
                    const deliveryQty = getDeliveriesSum(item._id);

                    return (
                      <tr key={item._id}>
                        <td data-label="Ingredient" style={{ fontWeight: 600 }}>{item.name}</td>
                        <td data-label="Unit">
                          <span className="badge" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>{item.unit}</span>
                        </td>
                        <td data-label="Start Stock" style={{ color: 'var(--text-muted)' }}>{startQty} {item.unit}</td>
                        <td data-label="Deliveries" style={{ color: 'var(--success)', fontWeight: 500 }}>
                          {deliveryQty > 0 ? `+${deliveryQty} ${item.unit}` : '-'}
                        </td>
                        <td data-label="Current Stock">
                          {item.quantityPerBox > 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <input
                                type="number"
                                placeholder="Boxes"
                                className="input-field"
                                value={endingBoxesInput[item._id] || ''}
                                onChange={(e) => handleBoxesChange(item._id, e.target.value, item.quantityPerBox)}
                                style={{ maxWidth: '80px', height: '34px', background: 'rgba(0,0,0,0.2)', textAlign: 'center' }}
                              />
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>box +</span>
                              <input
                                type="number"
                                placeholder="Units"
                                className="input-field"
                                value={endingLooseInput[item._id] || ''}
                                onChange={(e) => handleLooseChange(item._id, e.target.value, item.quantityPerBox)}
                                style={{ maxWidth: '80px', height: '34px', background: 'rgba(0,0,0,0.2)', textAlign: 'center' }}
                              />
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>pcs</span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', marginLeft: '0.5rem' }}>
                                (= {endingCounts[item._id] || 0} {item.unit})
                              </span>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <input
                                type="number"
                                placeholder="Loose Qty"
                                className="input-field"
                                value={endingLooseInput[item._id] || ''}
                                onChange={(e) => handleLooseChange(item._id, e.target.value, 0)}
                                style={{ maxWidth: '120px', height: '34px', background: 'rgba(0,0,0,0.2)', textAlign: 'center' }}
                              />
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.unit}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button
              onClick={handleGenerateReport}
              className="btn btn-primary"
              disabled={generating || rawItems.length === 0}
              style={{ width: '100%', padding: '0.85rem', marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
            >
              <Sparkles size={18} />
              {generating ? 'Processing Report & AI depleted variance...' : 'Generate Interval Audit Report'}
            </button>
          </div>

        </div>
      ))}

      {/* ================= MANAGE DELIVERIES VIEW ================= */}
      {activeMainTab === 'deliveries' && (
        <div style={{ display: 'grid', gridTemplateColumns: '210px 1fr', gap: '1rem', alignItems: 'start' }}>
          {/* Left Column: Calendar Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', width: '210px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Calendar size={15} style={{ color: 'var(--primary)' }} /> Select Date
            </h3>

            {/* Toggle between Single and Range */}
            <div style={{ display: 'flex', gap: '0.2rem', background: 'rgba(0,0,0,0.2)', padding: '0.15rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <button
                type="button"
                className={`btn ${manageDateMode === 'single' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleToggleDateMode('single')}
                style={{ flex: 1, padding: '0.2rem 0.4rem', fontSize: '0.7rem', height: '26px' }}
              >
                Single Date
              </button>
              <button
                type="button"
                className={`btn ${manageDateMode === 'range' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleToggleDateMode('range')}
                style={{ flex: 1, padding: '0.2rem 0.4rem', fontSize: '0.7rem', height: '26px' }}
              >
                Date Range
              </button>
            </div>
            
            {manageDateMode === 'single' ? (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.7rem', marginBottom: '2px' }}>Date Context</label>
                <input
                  type="date"
                  className="input-field"
                  value={manageDate}
                  onChange={(e) => setManageDate(e.target.value)}
                  style={{ fontSize: '0.75rem', height: '28px', padding: '0.25rem' }}
                />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.7rem', marginBottom: '2px', color: manageRangeClickTarget === 'start' ? 'var(--primary)' : 'var(--text-secondary)' }}>
                    Start Date {manageRangeClickTarget === 'start' && '👉'}
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    value={manageStartDate}
                    onChange={(e) => setManageStartDate(e.target.value)}
                    style={{ fontSize: '0.75rem', height: '28px', padding: '0.25rem' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.7rem', marginBottom: '2px', color: manageRangeClickTarget === 'end' ? 'var(--primary)' : 'var(--text-secondary)' }}>
                    End Date {manageRangeClickTarget === 'end' && '👉'}
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    value={manageEndDate}
                    onChange={(e) => setManageEndDate(e.target.value)}
                    style={{ fontSize: '0.75rem', height: '28px', padding: '0.25rem' }}
                  />
                </div>
              </div>
            )}

            <InventoryCalendar 
              sessions={sessions}
              onSelectDate={handleManageCalendarDateSelect}
              selectedDate={manageDateMode === 'single' ? manageDate : null}
              selectedStartDate={manageDateMode === 'range' ? manageStartDate : null}
              selectedEndDate={manageDateMode === 'range' ? manageEndDate : null}
              compact={true}
            />
          </div>

          {/* Right Column: Manage Deliveries List */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                  {manageDateMode === 'single' ? `Manage Deliveries for ${manageDate}` : `Manage Deliveries from ${manageStartDate} to ${manageEndDate}`}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Add, edit, or wipe delivery records for this selection
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleResetManageDeliveries}
                style={{ borderColor: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
              >
                Reset to 0
              </button>
            </div>

            {loadingManageData ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 1rem', gap: '1rem' }}>
                <div style={{ width: '28px', height: '28px', border: '3px solid rgba(249,115,22,0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Loading deliveries from database...</p>
              </div>
            ) : (
              <>
                {/* Search / Filter */}
                <div style={{ position: 'relative' }}>
                  <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} size={16} />
                  <input
                    type="text"
                    placeholder="Search delivery item description..."
                    className="input-field"
                    value={searchManageDeliveries}
                    onChange={(e) => setSearchManageDeliveries(e.target.value)}
                    style={{ paddingLeft: '34px', width: '100%', boxSizing: 'border-box', height: '36px', fontSize: '0.85rem' }}
                  />
                </div>

                {/* Table list */}
                <div className="table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  <table className="custom-table responsive-table" style={{ fontSize: '0.8rem' }}>
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Mapped Database Ingredient</th>
                        {manageDateMode === 'range' && <th style={{ width: '120px', minWidth: '120px' }}>Date</th>}
                        <th style={{ width: '130px', minWidth: '130px', textAlign: 'right' }}>Qty</th>
                        <th style={{ width: '130px', minWidth: '130px', textAlign: 'right' }}>Price ($)</th>
                        <th style={{ width: '60px', minWidth: '60px', textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Manually Add Entry Row */}
                      <tr style={{ background: 'rgba(249,115,22,0.02)', borderBottom: '2px dashed rgba(255,255,255,0.06)' }}>
                        <td data-label="Description">
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(New Item)</span>
                        </td>
                        <td data-label="Mapped Ingredient">
                          <select
                            value={newDeliveryRawItemId}
                            onChange={(e) => setNewDeliveryRawItemId(e.target.value)}
                            className="input-field"
                            style={{ height: '30px', fontSize: '0.75rem', background: 'rgba(0,0,0,0.3)', width: '100%' }}
                          >
                            <option value="">-- Mapped Ingredient --</option>
                            {rawItems.map(raw => (
                              <option key={raw._id} value={raw._id}>{raw.name} ({raw.unit})</option>
                            ))}
                          </select>
                        </td>
                        {manageDateMode === 'range' && (
                          <td data-label="Date">
                            <select
                              value={newDeliveryDate || manageStartDate}
                              onChange={(e) => setNewDeliveryDate(e.target.value)}
                              className="input-field"
                              style={{ height: '30px', fontSize: '0.75rem', background: 'rgba(0,0,0,0.3)', width: '100%' }}
                            >
                              {getDatesInRange(manageStartDate, manageEndDate).map(d => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </td>
                        )}
                        <td data-label="Qty" style={{ width: '130px', minWidth: '130px' }}>
                          {newDeliveryRawItemId && rawItems.find(r => r._id === newDeliveryRawItemId)?.quantityPerBox > 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end' }}>
                              <input
                                type="number"
                                placeholder="Boxes"
                                value={newDeliveryBoxes}
                                onChange={(e) => setNewDeliveryBoxes(e.target.value)}
                                className="input-field"
                                style={{ maxWidth: '50px', height: '30px', fontSize: '0.75rem', textAlign: 'center', background: 'rgba(0,0,0,0.3)', padding: '0' }}
                              />
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>box +</span>
                              <input
                                type="number"
                                placeholder="Pcs"
                                value={newDeliveryPieces}
                                onChange={(e) => setNewDeliveryPieces(e.target.value)}
                                className="input-field"
                                style={{ maxWidth: '55px', height: '30px', fontSize: '0.75rem', textAlign: 'center', background: 'rgba(0,0,0,0.3)', padding: '0' }}
                              />
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>pcs</span>
                            </div>
                          ) : (
                            <input
                              type="number"
                              min="0"
                              placeholder="Qty"
                              value={newDeliveryQuantity}
                              onChange={(e) => setNewDeliveryQuantity(e.target.value)}
                              className="input-field"
                              style={{ height: '30px', fontSize: '0.75rem', textAlign: 'right', background: 'rgba(0,0,0,0.3)', width: '100%', boxSizing: 'border-box' }}
                            />
                          )}
                        </td>
                        <td data-label="Price ($)" style={{ width: '130px', minWidth: '130px' }}>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="Price"
                            value={newDeliveryPrice}
                            onChange={(e) => setNewDeliveryPrice(e.target.value)}
                            className="input-field"
                            style={{ height: '30px', fontSize: '0.75rem', textAlign: 'right', background: 'rgba(0,0,0,0.3)', width: '100%', boxSizing: 'border-box' }}
                          />
                        </td>
                        <td data-label="Action" style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={handleAddManageDeliveryItem}
                            disabled={!newDeliveryRawItemId}
                            className="btn btn-primary"
                            style={{ padding: '0.25rem 0.5rem', display: 'inline-flex', alignItems: 'center', height: '30px' }}
                          >
                            <Plus size={14} />
                          </button>
                        </td>
                      </tr>

                      {/* Entered list */}
                      {manageDeliveries.filter(item => {
                        return item.name.toLowerCase().includes(searchManageDeliveries.toLowerCase());
                      }).length === 0 ? (
                        <tr>
                          <td colSpan={manageDateMode === 'range' ? 6 : 5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                            No deliveries found for this selection. Upload invoices or add items above.
                          </td>
                        </tr>
                      ) : (
                        manageDeliveries.map((item, idx) => {
                          if (!item.name.toLowerCase().includes(searchManageDeliveries.toLowerCase())) return null;
                          const rItem = rawItems.find(r => r._id === item.rawItemId);
                          const hasBoxConfig = rItem && rItem.quantityPerBox > 0;

                          return (
                            <tr key={item.id || idx}>
                              <td data-label="Description" style={{ fontWeight: 600 }}>
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => {
                                    const updated = [...manageDeliveries];
                                    updated[idx].name = e.target.value;
                                    setManageDeliveries(updated);
                                  }}
                                  className="input-field"
                                  style={{ height: '30px', fontSize: '0.8rem', background: 'rgba(0,0,0,0.2)' }}
                                />
                              </td>
                              <td data-label="Mapped Ingredient">
                                <select
                                  value={item.rawItemId || ''}
                                  onChange={(e) => {
                                    const updated = [...manageDeliveries];
                                    const newRawId = e.target.value;
                                    updated[idx].rawItemId = newRawId;
                                    const newRaw = rawItems.find(r => r._id === newRawId);
                                    updated[idx].name = newRaw?.name || updated[idx].name;
                                    if (newRaw && newRaw.quantityPerBox > 0) {
                                      const currentQty = Number(updated[idx].boxesInput) || Number(updated[idx].piecesInput) || updated[idx].quantity || 0;
                                      updated[idx].boxesInput = String(currentQty);
                                      updated[idx].piecesInput = '0';
                                      updated[idx].quantity = currentQty * newRaw.quantityPerBox;
                                    } else {
                                      const currentQty = Number(updated[idx].boxesInput) * (rItem?.quantityPerBox || 1) + (Number(updated[idx].piecesInput) || 0) || updated[idx].quantity || 0;
                                      updated[idx].boxesInput = '';
                                      updated[idx].piecesInput = String(currentQty);
                                      updated[idx].quantity = currentQty;
                                    }
                                    setManageDeliveries(updated);
                                  }}
                                  className="input-field"
                                  style={{ height: '30px', fontSize: '0.8rem', background: 'rgba(0,0,0,0.2)' }}
                                >
                                  <option value="">-- Select Ingredient --</option>
                                  {rawItems.map(raw => (
                                    <option key={raw._id} value={raw._id}>{raw.name} ({raw.unit})</option>
                                  ))}
                                </select>
                              </td>
                              {manageDateMode === 'range' && (
                                <td data-label="Date">
                                  <span className="badge" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', fontSize: '0.7rem' }}>
                                    {item.date}
                                  </span>
                                </td>
                              )}
                              <td data-label="Qty" style={{ width: '130px', minWidth: '130px' }}>
                                {hasBoxConfig ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end' }}>
                                    <input
                                      type="number"
                                      placeholder="Boxes"
                                      value={item.boxesInput ?? ''}
                                      onChange={(e) => {
                                        const updated = [...manageDeliveries];
                                        updated[idx].boxesInput = e.target.value;
                                        const boxes = Number(e.target.value) || 0;
                                        const pieces = Number(updated[idx].piecesInput) || 0;
                                        updated[idx].quantity = (boxes * rItem.quantityPerBox) + pieces;
                                        setManageDeliveries(updated);
                                      }}
                                      className="input-field"
                                      style={{ maxWidth: '50px', height: '30px', fontSize: '0.75rem', textAlign: 'center', background: 'rgba(0,0,0,0.2)', padding: '0' }}
                                    />
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>box +</span>
                                    <input
                                      type="number"
                                      placeholder="Pcs"
                                      value={item.piecesInput ?? ''}
                                      onChange={(e) => {
                                        const updated = [...manageDeliveries];
                                        updated[idx].piecesInput = e.target.value;
                                        const boxes = Number(updated[idx].boxesInput) || 0;
                                        const pieces = Number(e.target.value) || 0;
                                        updated[idx].quantity = (boxes * rItem.quantityPerBox) + pieces;
                                        setManageDeliveries(updated);
                                      }}
                                      className="input-field"
                                      style={{ maxWidth: '50px', height: '30px', fontSize: '0.75rem', textAlign: 'center', background: 'rgba(0,0,0,0.2)', padding: '0' }}
                                    />
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>pcs</span>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--primary)' }}>
                                      (= {item.quantity || 0})
                                    </span>
                                  </div>
                                ) : (
                                  <input
                                    type="number"
                                    min="0"
                                    value={item.quantity}
                                    onChange={(e) => {
                                      const updated = [...manageDeliveries];
                                      updated[idx].quantity = Number(e.target.value) || 0;
                                      updated[idx].piecesInput = e.target.value;
                                      setManageDeliveries(updated);
                                    }}
                                    className="input-field"
                                    style={{ height: '30px', fontSize: '0.8rem', textAlign: 'right', background: 'rgba(0,0,0,0.2)', width: '100%', boxSizing: 'border-box' }}
                                  />
                                )}
                              </td>
                              <td data-label="Price ($)" style={{ width: '130px', minWidth: '130px' }}>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={item.price}
                                  onChange={(e) => {
                                    const updated = [...manageDeliveries];
                                    updated[idx].price = Number(e.target.value) || 0;
                                    setManageDeliveries(updated);
                                  }}
                                  className="input-field"
                                  style={{ height: '30px', fontSize: '0.8rem', textAlign: 'right', background: 'rgba(0,0,0,0.2)', width: '100%', boxSizing: 'border-box' }}
                                />
                              </td>
                              <td data-label="Action" style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => setManageDeliveries(prev => prev.filter((_, i) => i !== idx))}
                                  style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.25rem' }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Save button */}
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveManageDeliveries}
                  style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
                >
                  Save Deliveries changes
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ================= MANAGE SALES VIEW ================= */}
      {activeMainTab === 'sales' && (
        <div style={{ display: 'grid', gridTemplateColumns: '210px 1fr', gap: '1rem', alignItems: 'start' }}>
          {/* Left Column: Calendar Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', width: '210px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Calendar size={15} style={{ color: 'var(--primary)' }} /> Select Date
            </h3>

            {/* Toggle between Single and Range */}
            <div style={{ display: 'flex', gap: '0.2rem', background: 'rgba(0,0,0,0.2)', padding: '0.15rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <button
                type="button"
                className={`btn ${manageDateMode === 'single' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleToggleDateMode('single')}
                style={{ flex: 1, padding: '0.2rem 0.4rem', fontSize: '0.7rem', height: '26px' }}
              >
                Single Date
              </button>
              <button
                type="button"
                className={`btn ${manageDateMode === 'range' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleToggleDateMode('range')}
                style={{ flex: 1, padding: '0.2rem 0.4rem', fontSize: '0.7rem', height: '26px' }}
              >
                Date Range
              </button>
            </div>
            
            {manageDateMode === 'single' ? (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.7rem', marginBottom: '2px' }}>Date Context</label>
                <input
                  type="date"
                  className="input-field"
                  value={manageDate}
                  onChange={(e) => setManageDate(e.target.value)}
                  style={{ fontSize: '0.75rem', height: '28px', padding: '0.25rem' }}
                />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.7rem', marginBottom: '2px', color: manageRangeClickTarget === 'start' ? 'var(--primary)' : 'var(--text-secondary)' }}>
                    Start Date {manageRangeClickTarget === 'start' && '👉'}
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    value={manageStartDate}
                    onChange={(e) => setManageStartDate(e.target.value)}
                    style={{ fontSize: '0.75rem', height: '28px', padding: '0.25rem' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.7rem', marginBottom: '2px', color: manageRangeClickTarget === 'end' ? 'var(--primary)' : 'var(--text-secondary)' }}>
                    End Date {manageRangeClickTarget === 'end' && '👉'}
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    value={manageEndDate}
                    onChange={(e) => setManageEndDate(e.target.value)}
                    style={{ fontSize: '0.75rem', height: '28px', padding: '0.25rem' }}
                  />
                </div>
              </div>
            )}

            <InventoryCalendar 
              sessions={sessions}
              onSelectDate={handleManageCalendarDateSelect}
              selectedDate={manageDateMode === 'single' ? manageDate : null}
              selectedStartDate={manageDateMode === 'range' ? manageStartDate : null}
              selectedEndDate={manageDateMode === 'range' ? manageEndDate : null}
              compact={true}
            />
          </div>

          {/* Right Column: Manage Sales List */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                  {manageDateMode === 'single' ? `Manage Sales Data for ${manageDate}` : `Manage Sales Data from ${manageStartDate} to ${manageEndDate}`}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Add, edit, or wipe recipe sales figures for this selection
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleResetManageSales}
                style={{ borderColor: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
              >
                Reset to 0
              </button>
            </div>

            {loadingManageData ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 1rem', gap: '1rem' }}>
                <div style={{ width: '28px', height: '28px', border: '3px solid rgba(249,115,22,0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Loading sales data from database...</p>
              </div>
            ) : (
              <>
                {/* Sales POS source file name */}
                {manageDateMode === 'single' && (
                  <div className="form-group" style={{ marginBottom: '0.25rem' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Sales Source File / POS Label</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. SalesReport_Jun20.csv"
                      value={manageSalesFileName}
                      onChange={(e) => setManageSalesFileName(e.target.value)}
                      style={{ height: '36px', fontSize: '0.85rem' }}
                    />
                  </div>
                )}

                {/* Search / Filter */}
                <div style={{ position: 'relative' }}>
                  <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} size={16} />
                  <input
                    type="text"
                    placeholder="Search by SKU or menu item name..."
                    className="input-field"
                    value={searchManageSales}
                    onChange={(e) => setSearchManageSales(e.target.value)}
                    style={{ paddingLeft: '34px', width: '100%', boxSizing: 'border-box', height: '36px', fontSize: '0.85rem' }}
                  />
                </div>

                {/* Table list */}
                <div className="table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  <table className="custom-table responsive-table" style={{ fontSize: '0.8rem' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '130px', minWidth: '130px' }}>SKU / Code</th>
                        <th>Menu Product Name</th>
                        {manageDateMode === 'range' && <th style={{ width: '120px', minWidth: '120px' }}>Date</th>}
                        <th style={{ width: '130px', minWidth: '130px', textAlign: 'right' }}>Qty Sold</th>
                        <th style={{ width: '130px', minWidth: '130px', textAlign: 'right' }}>Price ($)</th>
                        <th style={{ width: '60px', minWidth: '60px', textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Manually Add Entry Row */}
                      <tr style={{ background: 'rgba(249,115,22,0.02)', borderBottom: '2px dashed rgba(255,255,255,0.06)' }}>
                        <td data-label="SKU">
                          <select
                            value={newSalesSku}
                            onChange={(e) => setNewSalesSku(e.target.value)}
                            className="input-field"
                            style={{ height: '30px', fontSize: '0.75rem', background: 'rgba(0,0,0,0.3)', width: '100%' }}
                          >
                            <option value="">-- Select SKU --</option>
                            {recipes.map(rec => (
                              <option key={rec._id} value={rec.menuItemSku}>{rec.menuItemSku}</option>
                            ))}
                          </select>
                        </td>
                        <td data-label="Menu Product Name">
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {recipes.find(r => r.menuItemSku === newSalesSku)?.menuItemName || '(Product Auto Name)'}
                          </span>
                        </td>
                        {manageDateMode === 'range' && (
                          <td data-label="Date">
                            <select
                              value={newSalesDate || manageStartDate}
                              onChange={(e) => setNewSalesDate(e.target.value)}
                              className="input-field"
                              style={{ height: '30px', fontSize: '0.75rem', background: 'rgba(0,0,0,0.3)', width: '100%' }}
                            >
                              {getDatesInRange(manageStartDate, manageEndDate).map(d => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </td>
                        )}
                        <td data-label="Qty Sold" style={{ width: '130px', minWidth: '130px' }}>
                          <input
                            type="number"
                            min="0"
                            placeholder="Qty"
                            value={newSalesQuantitySold}
                            onChange={(e) => setNewSalesQuantitySold(e.target.value)}
                            className="input-field"
                            style={{ height: '30px', fontSize: '0.75rem', textAlign: 'right', background: 'rgba(0,0,0,0.3)', width: '100%', boxSizing: 'border-box' }}
                          />
                        </td>
                        <td data-label="Price ($)" style={{ width: '130px', minWidth: '130px' }}>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="Price"
                            value={newSalesPrice}
                            onChange={(e) => setNewSalesPrice(e.target.value)}
                            className="input-field"
                            style={{ height: '30px', fontSize: '0.75rem', textAlign: 'right', background: 'rgba(0,0,0,0.3)', width: '100%', boxSizing: 'border-box' }}
                          />
                        </td>
                        <td data-label="Action" style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={handleAddManageSalesItem}
                            disabled={!newSalesSku}
                            className="btn btn-primary"
                            style={{ padding: '0.25rem 0.5rem', display: 'inline-flex', alignItems: 'center', height: '30px' }}
                          >
                            <Plus size={14} />
                          </button>
                        </td>
                      </tr>

                      {/* Entries list */}
                      {manageSales.filter(item => {
                        const search = searchManageSales.toLowerCase();
                        return item.sku.toLowerCase().includes(search) || item.name.toLowerCase().includes(search);
                      }).length === 0 ? (
                        <tr>
                          <td colSpan={manageDateMode === 'range' ? 6 : 5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                            No sales records found for this selection. Upload POS reports or add entries above.
                          </td>
                        </tr>
                      ) : (
                        manageSales.map((item, idx) => {
                          const search = searchManageSales.toLowerCase();
                          if (!item.sku.toLowerCase().includes(search) && !item.name.toLowerCase().includes(search)) return null;
                          return (
                            <tr key={item.id || idx}>
                              <td data-label="SKU">
                                <select
                                  value={item.sku || ''}
                                  onChange={(e) => {
                                    const updated = [...manageSales];
                                    updated[idx].sku = e.target.value;
                                    const match = recipes.find(r => r.menuItemSku === e.target.value);
                                    if (match) {
                                      updated[idx].name = match.menuItemName;
                                    }
                                    setManageSales(updated);
                                  }}
                                  className="input-field"
                                  style={{ height: '30px', fontSize: '0.8rem', background: 'rgba(0,0,0,0.2)' }}
                                >
                                  <option value="">-- No SKU --</option>
                                  {recipes.map(rec => (
                                    <option key={rec._id} value={rec.menuItemSku}>{rec.menuItemSku}</option>
                                  ))}
                                </select>
                              </td>
                              <td data-label="Menu Product Name" style={{ fontWeight: 600 }}>
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => {
                                    const updated = [...manageSales];
                                    updated[idx].name = e.target.value;
                                    setManageSales(updated);
                                  }}
                                  className="input-field"
                                  style={{ height: '30px', fontSize: '0.8rem', background: 'rgba(0,0,0,0.2)' }}
                                />
                              </td>
                              {manageDateMode === 'range' && (
                                <td data-label="Date">
                                  <span className="badge" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', fontSize: '0.7rem' }}>
                                    {item.date}
                                  </span>
                                </td>
                              )}
                              <td data-label="Qty Sold" style={{ width: '130px', minWidth: '130px' }}>
                                <input
                                  type="number"
                                  min="0"
                                  value={item.quantitySold}
                                  onChange={(e) => {
                                    const updated = [...manageSales];
                                    updated[idx].quantitySold = Number(e.target.value) || 0;
                                    setManageSales(updated);
                                  }}
                                  className="input-field"
                                  style={{ height: '30px', fontSize: '0.8rem', textAlign: 'right', background: 'rgba(0,0,0,0.2)', width: '100%', boxSizing: 'border-box' }}
                                />
                              </td>
                              <td data-label="Price ($)" style={{ width: '130px', minWidth: '130px' }}>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={item.price}
                                  onChange={(e) => {
                                    const updated = [...manageSales];
                                    updated[idx].price = Number(e.target.value) || 0;
                                    setManageSales(updated);
                                  }}
                                  className="input-field"
                                  style={{ height: '30px', fontSize: '0.8rem', textAlign: 'right', background: 'rgba(0,0,0,0.2)', width: '100%', boxSizing: 'border-box' }}
                                />
                              </td>
                              <td data-label="Action" style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => setManageSales(prev => prev.filter((_, i) => i !== idx))}
                                  style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.25rem' }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Save button */}
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveManageSales}
                  style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
                >
                  Save Sales changes
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ================= INVOICE GEMINI EXTRACTION MODAL ================= */}
      {isInvoiceModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content card animate-fade-in" style={{ padding: '2rem', maxWidth: '850px', width: '95%', position: 'relative' }}>
            <button 
              onClick={() => setIsInvoiceModalOpen(false)} 
              style={{ position: 'absolute', right: '1.25rem', top: '1.25rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            <h2 className="form-label" style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={20} style={{ color: 'var(--primary)' }} /> Gemini Extracted Invoice Deliveries
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Review the extracted invoice items below. Map unmatched items to the correct raw ingredient database key before confirming.
            </p>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem', padding: '0.75rem', background: 'rgba(249,115,22,0.05)', border: '1px dashed rgba(249,115,22,0.2)', borderRadius: '8px' }}>
              <span style={{ margin: 0, whiteSpace: 'nowrap', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Invoice / Delivery Date:</span>
              <input
                type="date"
                className="input-field"
                value={invoiceDate || endDate}
                onChange={(e) => {
                  const newDate = e.target.value;
                  setInvoiceDate(newDate);
                  setExtractedInvoiceItems(prev => prev.map(item => ({ ...item, date: newDate })));
                }}
                style={{ maxWidth: '180px', height: '32px', fontSize: '0.85rem', padding: '0.25rem 0.5rem', background: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.1)' }}
              />
            </div>

            <div className="table-container" style={{ maxHeight: '320px', overflowY: 'auto', marginBottom: '1.5rem' }}>
              <table className="custom-table responsive-table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th>Extracted Description</th>
                    <th>Mapped Database Ingredient</th>
                    <th style={{ width: '110px', textAlign: 'center' }}>Pcs/Box</th>
                    <th style={{ width: '120px', textAlign: 'center' }}>Receive Unit</th>
                    <th style={{ minWidth: '220px' }}>Qty Received</th>
                  </tr>
                </thead>
                <tbody>
                  {extractedInvoiceItems.map((item, idx) => {
                    const matchedRaw = rawItems.find(r => r._id === item.rawItemId);
                    const qtyPerBox = matchedRaw ? (matchedRaw.quantityPerBox || 0) : 0;

                    return (
                      <tr key={idx} style={{ background: item.rawItemId ? '' : 'rgba(239, 68, 68, 0.05)' }}>
                        <td data-label="Extracted Description">{item.name}</td>
                        <td data-label="Mapped Ingredient">
                          <select
                            className="input-field"
                            value={item.rawItemId || ''}
                            onChange={(e) => {
                              const updated = [...extractedInvoiceItems];
                              const newRawId = e.target.value || null;
                              updated[idx].rawItemId = newRawId;
                              
                              const newRaw = rawItems.find(r => r._id === newRawId);
                              if (newRaw) {
                                updated[idx].receiveAs = 'box';
                                const currentQty = Number(updated[idx].boxesInput) || Number(updated[idx].piecesInput) || updated[idx].quantity || 0;
                                updated[idx].boxesInput = String(currentQty);
                                updated[idx].piecesInput = '0';
                                updated[idx].quantity = newRaw.quantityPerBox > 0 ? (currentQty * newRaw.quantityPerBox) : 0;
                              } else {
                                const currentQty = (Number(updated[idx].boxesInput) * (matchedRaw?.quantityPerBox || 1)) + (Number(updated[idx].piecesInput) || 0) || updated[idx].quantity || 0;
                                updated[idx].boxesInput = '';
                                updated[idx].piecesInput = String(currentQty);
                                updated[idx].quantity = currentQty;
                                updated[idx].receiveAs = 'pcs';
                              }
                              setExtractedInvoiceItems(updated);
                            }}
                            style={{ fontSize: '0.75rem', padding: '0.2rem', height: '28px', background: 'rgba(0,0,0,0.3)', width: '100%' }}
                          >
                            <option value="">-- Unmapped / Skip Item --</option>
                            {rawItems.map(raw => (
                              <option key={raw._id} value={raw._id}>{raw.name} ({raw.unit})</option>
                            ))}
                          </select>
                        </td>
                        <td data-label="Pcs/Box" style={{ textAlign: 'center' }}>
                          {item.rawItemId ? (
                            <input
                              type="number"
                              min="0"
                              placeholder="Pcs/Box"
                              value={qtyPerBox || ''}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                if (matchedRaw) matchedRaw.quantityPerBox = val;
                                const updated = [...extractedInvoiceItems];
                                const targetItem = updated[idx];
                                const boxes = Number(targetItem.boxesInput) || 0;
                                const pieces = Number(targetItem.piecesInput) || 0;
                                if (targetItem.receiveAs === 'pcs') {
                                  targetItem.quantity = pieces;
                                } else {
                                  targetItem.quantity = val > 0 ? (boxes * val + pieces) : pieces;
                                }
                                setExtractedInvoiceItems(updated);
                              }}
                              onBlur={async (e) => {
                                const val = Number(e.target.value) || 0;
                                await handleUpdateRawItemBoxQty(item.rawItemId, val);
                              }}
                              className="input-field"
                              style={{ maxWidth: '80px', height: '28px', fontSize: '0.75rem', padding: '0.2rem', textAlign: 'center', background: 'rgba(0,0,0,0.3)', margin: '0 auto' }}
                            />
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          )}
                        </td>
                        <td data-label="Receive Unit" style={{ textAlign: 'center' }}>
                          {item.rawItemId ? (
                            <select
                              className="input-field"
                              value={item.receiveAs || 'box'}
                              onChange={(e) => {
                                const val = e.target.value;
                                const updated = [...extractedInvoiceItems];
                                const targetItem = updated[idx];
                                if (val === 'pcs') {
                                  const currentBoxes = Number(targetItem.boxesInput) || 0;
                                  const currentPieces = Number(targetItem.piecesInput) || 0;
                                  const targetPieces = currentBoxes * qtyPerBox + currentPieces;
                                  targetItem.piecesInput = String(targetPieces || currentBoxes || 0);
                                  targetItem.boxesInput = '';
                                  targetItem.quantity = targetPieces || currentBoxes || 0;
                                  targetItem.receiveAs = 'pcs';
                                } else {
                                  const currentPieces = Number(targetItem.piecesInput) || 0;
                                  if (qtyPerBox > 0) {
                                    const targetBoxes = Math.floor(currentPieces / qtyPerBox);
                                    const targetPieces = currentPieces % qtyPerBox;
                                    targetItem.boxesInput = String(targetBoxes || currentPieces || 0);
                                    targetItem.piecesInput = String(targetPieces);
                                    targetItem.quantity = currentPieces;
                                  } else {
                                    targetItem.boxesInput = String(currentPieces || 0);
                                    targetItem.piecesInput = '0';
                                    targetItem.quantity = 0;
                                  }
                                  targetItem.receiveAs = 'box';
                                }
                                setExtractedInvoiceItems(updated);
                              }}
                              style={{ fontSize: '0.75rem', padding: '0.2rem', height: '28px', background: 'rgba(0,0,0,0.3)', width: '100%' }}
                            >
                              <option value="box">Box</option>
                              <option value="pcs">Pcs</option>
                            </select>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          )}
                        </td>
                        <td data-label="Qty Received">
                          {item.rawItemId ? (
                            item.receiveAs === 'pcs' ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <input
                                  type="number"
                                  placeholder="Pcs"
                                  className="input-field"
                                  value={item.piecesInput ?? ''}
                                  onChange={(e) => {
                                    const updated = [...extractedInvoiceItems];
                                    updated[idx].piecesInput = e.target.value;
                                    updated[idx].quantity = Number(e.target.value) || 0;
                                    setExtractedInvoiceItems(updated);
                                  }}
                                  style={{ maxWidth: '70px', height: '28px', fontSize: '0.75rem', padding: '0.2rem', textAlign: 'center', background: 'rgba(0,0,0,0.3)' }}
                                />
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>pcs</span>
                              </div>
                            ) : qtyPerBox > 0 ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <input
                                  type="number"
                                  placeholder="Boxes"
                                  className="input-field"
                                  value={item.boxesInput ?? ''}
                                  onChange={(e) => {
                                    const updated = [...extractedInvoiceItems];
                                    updated[idx].boxesInput = e.target.value;
                                    const boxes = Number(e.target.value) || 0;
                                    const pieces = Number(updated[idx].piecesInput) || 0;
                                    updated[idx].quantity = (boxes * qtyPerBox) + pieces;
                                    setExtractedInvoiceItems(updated);
                                  }}
                                  style={{ maxWidth: '60px', height: '28px', fontSize: '0.75rem', padding: '0.2rem', textAlign: 'center', background: 'rgba(0,0,0,0.3)' }}
                                />
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>box +</span>
                                <input
                                  type="number"
                                  placeholder="Pcs"
                                  className="input-field"
                                  value={item.piecesInput ?? ''}
                                  onChange={(e) => {
                                    const updated = [...extractedInvoiceItems];
                                    updated[idx].piecesInput = e.target.value;
                                    const boxes = Number(updated[idx].boxesInput) || 0;
                                    const pieces = Number(e.target.value) || 0;
                                    updated[idx].quantity = (boxes * qtyPerBox) + pieces;
                                    setExtractedInvoiceItems(updated);
                                  }}
                                  style={{ maxWidth: '60px', height: '28px', fontSize: '0.75rem', padding: '0.2rem', textAlign: 'center', background: 'rgba(0,0,0,0.3)' }}
                                />
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>pcs</span>
                                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                                  (= {item.quantity || 0} {matchedRaw?.unit})
                                </span>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <input
                                  type="number"
                                  placeholder="Boxes"
                                  className="input-field"
                                  value={item.boxesInput ?? ''}
                                  onChange={(e) => {
                                    const updated = [...extractedInvoiceItems];
                                    updated[idx].boxesInput = e.target.value;
                                    const boxes = Number(e.target.value) || 0;
                                    const pieces = Number(updated[idx].piecesInput) || 0;
                                    updated[idx].quantity = (boxes * qtyPerBox) + pieces;
                                    setExtractedInvoiceItems(updated);
                                  }}
                                  style={{ maxWidth: '70px', height: '28px', fontSize: '0.75rem', padding: '0.2rem', textAlign: 'center', background: 'rgba(0,0,0,0.3)' }}
                                />
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>box</span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--warning)', whiteSpace: 'nowrap' }}>
                                  (Pcs/Box not set)
                                </span>
                              </div>
                            )
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <input
                                type="number"
                                placeholder="Qty"
                                className="input-field"
                                value={item.piecesInput ?? ''}
                                onChange={(e) => {
                                  const updated = [...extractedInvoiceItems];
                                  updated[idx].piecesInput = e.target.value;
                                  updated[idx].quantity = Number(e.target.value) || 0;
                                  setExtractedInvoiceItems(updated);
                                }}
                                style={{ maxWidth: '70px', height: '28px', fontSize: '0.75rem', padding: '0.2rem', textAlign: 'center', background: 'rgba(0,0,0,0.3)' }}
                              />
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsInvoiceModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleConfirmInvoice}>Confirm & Add Deliveries</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SALES REPORT GEMINI EXTRACTION MODAL ================= */}
      {isSalesModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content card animate-fade-in" style={{ padding: '2rem', maxWidth: '640px', position: 'relative' }}>
            <button 
              onClick={() => setIsSalesModalOpen(false)} 
              style={{ position: 'absolute', right: '1.25rem', top: '1.25rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            <h2 className="form-label" style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={20} style={{ color: 'var(--primary)' }} /> Gemini Extracted POS Sales Report
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Review the extracted quantities sold. Map items to their matching POS recipe SKU before importing.
            </p>

            <div className="table-container" style={{ maxHeight: '320px', overflowY: 'auto', marginBottom: '1.5rem' }}>
              <table className="custom-table responsive-table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th>SKU / Code</th>
                    <th>Menu Product Name</th>
                    <th>Quantity Sold</th>
                    <th>Sales Price ($)</th>
                  </tr>
                </thead>
                <tbody>
                  {extractedSalesItems.map((item, idx) => {
                    const matchedRecipe = recipes.find(r => r.menuItemSku === item.sku);

                    return (
                      <tr key={idx} style={{ background: matchedRecipe ? '' : 'rgba(245, 158, 11, 0.05)' }}>
                        <td data-label="SKU">
                          <select
                            value={item.sku || ''}
                            onChange={(e) => {
                              const updated = [...extractedSalesItems];
                              updated[idx].sku = e.target.value;
                              const match = recipes.find(r => r.menuItemSku === e.target.value);
                              if (match) {
                                updated[idx].name = match.menuItemName;
                              }
                              setExtractedSalesItems(updated);
                            }}
                            className="input-field"
                            style={{ fontSize: '0.75rem', padding: '0.2rem', height: '28px', background: 'rgba(0,0,0,0.3)', width: '100%', maxWidth: '130px' }}
                          >
                            <option value="">-- No SKU --</option>
                            {recipes.map(rec => (
                              <option key={rec._id} value={rec.menuItemSku}>{rec.menuItemSku} ({rec.menuItemName})</option>
                            ))}
                          </select>
                        </td>
                        <td data-label="Menu Product Name">{item.name}</td>
                        <td data-label="Quantity Sold">
                          <input
                            type="number"
                            value={item.quantitySold}
                            onChange={(e) => {
                              const updated = [...extractedSalesItems];
                              updated[idx].quantitySold = Number(e.target.value) || 0;
                              setExtractedSalesItems(updated);
                            }}
                            className="input-field"
                            style={{ maxWidth: '70px', height: '28px', fontSize: '0.75rem', padding: '0.2rem', textAlign: 'center', background: 'rgba(0,0,0,0.3)' }}
                          />
                        </td>
                        <td data-label="Sales Price">
                          <input
                            type="number"
                            step="any"
                            value={item.price}
                            onChange={(e) => {
                              const updated = [...extractedSalesItems];
                              updated[idx].price = Number(e.target.value) || 0;
                              setExtractedSalesItems(updated);
                            }}
                            className="input-field"
                            style={{ maxWidth: '80px', height: '28px', fontSize: '0.75rem', padding: '0.2rem', textAlign: 'center', background: 'rgba(0,0,0,0.3)' }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsSalesModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleConfirmSales}>Confirm & Import Sales</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= PERIOD INVENTORY COUNTS POPUP REPORT ================= */}
      {isPeriodCountsModalOpen && (() => {
        // Filter sessions within startDate and endDate
        const sessionsInRange = sessions.filter(sess => {
          if (!sess.date || !startDate || !endDate) return false;
          const sDate = new Date(startDate);
          sDate.setUTCHours(0,0,0,0);
          const eDate = new Date(endDate);
          eDate.setUTCHours(0,0,0,0);
          const sessDate = new Date(sess.date);
          sessDate.setUTCHours(0,0,0,0);
          return sessDate.getTime() >= sDate.getTime() && sessDate.getTime() <= eDate.getTime();
        });

        // Filter sessions that have actual counts logged
        const sessionsWithCounts = sessionsInRange.filter(sess => {
          const hasCounts = (sess.actualFinalInventory && sess.actualFinalInventory.some(i => i.quantity > 0)) ||
                            (sess.initialInventory && sess.initialInventory.some(i => i.quantity > 0));
          return hasCounts;
        }).sort((a, b) => new Date(a.date) - new Date(b.date));

        const getSessionItemCount = (sess, itemId) => {
          const hasFinal = sess.actualFinalInventory && sess.actualFinalInventory.some(i => i.quantity > 0);
          const inventoryToUse = hasFinal ? sess.actualFinalInventory : sess.initialInventory;
          const match = inventoryToUse.find(i => {
            const rawId = i.rawItemId?._id || i.rawItemId;
            return rawId?.toString() === itemId.toString();
          });
          return match ? match.quantity : 0;
        };

        const getSessionDeliveries = (sess, itemId) => {
          if (!sess.deliveries) return 0;
          const match = sess.deliveries.find(d => {
            const rawId = d.rawItemId?._id || d.rawItemId;
            return rawId?.toString() === itemId.toString();
          });
          return match ? match.quantity : 0;
        };

        const getPeriodDeliveriesSum = (itemId) => {
          return sessionsInRange.reduce((sum, sess) => {
            return sum + getSessionDeliveries(sess, itemId);
          }, 0);
        };

        return (
          <div className="modal-overlay" style={{ zIndex: 1100 }}>
            <div className="modal-content card animate-fade-in" style={{ padding: '2rem', maxWidth: '850px', width: '95%', position: 'relative', background: 'rgba(18, 20, 26, 0.95)', backdropFilter: 'blur(20px)', border: 'var(--glass-border)' }}>
              <button 
                onClick={() => setIsPeriodCountsModalOpen(false)} 
                style={{ position: 'absolute', right: '1.25rem', top: '1.25rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
              
              <h2 className="form-label" style={{ fontSize: '1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clipboard size={20} style={{ color: 'var(--primary)' }} /> Inventory of Date Range
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Period Selected: <span style={{ color: '#fff', fontWeight: 600 }}>{startDate}</span> to <span style={{ color: '#fff', fontWeight: 600 }}>{endDate}</span>
              </p>

              {sessionsWithCounts.length === 0 && sessionsInRange.every(s => !s.deliveries || s.deliveries.every(d => d.quantity === 0)) ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                  <ShieldAlert size={36} style={{ color: 'var(--warning)', marginBottom: '1rem' }} />
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>No inventory counts or deliveries were logged within this selected range.</p>
                </div>
              ) : (
                <>
                  <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '1.5rem' }}>
                    <table className="custom-table responsive-table" style={{ fontSize: '0.8rem' }}>
                      <thead>
                        <tr>
                          <th>Ingredient</th>
                          <th>Unit</th>
                          {sessionsWithCounts.map((sess, sIdx) => {
                            const formattedDate = new Date(sess.date).toLocaleDateString(undefined, { timeZone: 'UTC', month: 'short', day: 'numeric' });
                            return <th key={sess._id || sIdx} style={{ textAlign: 'right' }}>{formattedDate}</th>;
                          })}
                          <th style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>Total Deliveries Sum</th>
                          <th style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>Total Counts Sum</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rawItems.map(item => {
                          const rowTotal = sessionsWithCounts.reduce((sum, sess) => {
                            return sum + getSessionItemCount(sess, item._id);
                          }, 0);
                          const deliveryTotal = getPeriodDeliveriesSum(item._id);

                          return (
                            <tr key={item._id}>
                              <td data-label="Ingredient" style={{ fontWeight: 600 }}>{item.name}</td>
                              <td data-label="Unit">
                                <span className="badge" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                  {item.unit}
                                </span>
                              </td>
                              {sessionsWithCounts.map((sess, sIdx) => {
                                const qty = getSessionItemCount(sess, item._id);
                                return (
                                  <td key={sess._id || sIdx} data-label={new Date(sess.date).toLocaleDateString(undefined, { timeZone: 'UTC', month: 'short', day: 'numeric' })} style={{ textAlign: 'right', color: qty > 0 ? '#fff' : 'var(--text-muted)' }}>
                                    {qty.toFixed(1)}
                                  </td>
                                );
                              })}
                              <td data-label="Total Deliveries Sum" style={{ textAlign: 'right', fontWeight: 700, color: deliveryTotal > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                                {deliveryTotal.toFixed(1)}
                              </td>
                              <td data-label="Total Counts Sum" style={{ textAlign: 'right', fontWeight: 700, color: rowTotal > 0 ? 'var(--primary)' : 'var(--text-muted)' }}>
                                {rowTotal.toFixed(1)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" style={{ minWidth: '120px' }} onClick={() => setIsPeriodCountsModalOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        );
      })()}
      {/* ================= EDIT DELIVERIES POPUP MODAL ================= */}
      {isEditDeliveriesModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content card animate-fade-in" style={{ padding: '2rem', maxWidth: '850px', width: '90%', position: 'relative', background: 'rgba(18, 20, 26, 0.95)', backdropFilter: 'blur(20px)', border: 'var(--glass-border)' }}>
            <button 
              onClick={() => {
                setIsEditDeliveriesModalOpen(false);
                setEditDeliveriesSearch('');
                setEditDeliveriesSelectedId('');
              }} 
              style={{ position: 'absolute', right: '1.25rem', top: '1.25rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            
            <h2 className="form-label" style={{ fontSize: '1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Edit2 size={20} style={{ color: 'var(--primary)' }} /> Edit Added Deliveries
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Modify mapped ingredients, quantities, and unit prices for the current audit session.
            </p>

            {/* Filters Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} size={16} />
                <input
                  type="text"
                  placeholder="Search by description..."
                  className="input-field"
                  value={editDeliveriesSearch}
                  onChange={(e) => setEditDeliveriesSearch(e.target.value)}
                  style={{ paddingLeft: '34px', width: '100%', boxSizing: 'border-box', height: '36px', fontSize: '0.85rem' }}
                />
              </div>

              <select
                className="input-field"
                value={editDeliveriesSelectedId}
                onChange={(e) => setEditDeliveriesSelectedId(e.target.value)}
                style={{ height: '36px', fontSize: '0.85rem', background: 'rgba(0,0,0,0.3)', width: '100%' }}
              >
                <option value="">-- All Ingredients --</option>
                {rawItems.map(item => (
                  <option key={item._id} value={item._id}>{item.name}</option>
                ))}
              </select>
            </div>

            {/* Table Container */}
            <div className="table-container" style={{ maxHeight: '350px', overflowY: 'auto', marginBottom: '1.5rem' }}>
              {deliveries.filter(item => {
                const matchesSearch = item.name.toLowerCase().includes(editDeliveriesSearch.toLowerCase());
                const matchesId = !editDeliveriesSelectedId || item.rawItemId === editDeliveriesSelectedId;
                return matchesSearch && matchesId;
              }).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  No deliveries match the selected filters.
                </div>
              ) : (
                <table className="custom-table responsive-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Mapped Database Ingredient</th>
                      <th style={{ width: '130px' }}>Date</th>
                      <th style={{ width: '100px', textAlign: 'right' }}>Qty</th>
                      <th style={{ width: '100px', textAlign: 'right' }}>Price ($)</th>
                      <th style={{ width: '60px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveries.map((item, idx) => {
                      const matchesSearch = item.name.toLowerCase().includes(editDeliveriesSearch.toLowerCase());
                      const matchesId = !editDeliveriesSelectedId || item.rawItemId === editDeliveriesSelectedId;
                      if (!matchesSearch || !matchesId) return null;

                      const rItem = rawItems.find(r => r._id === item.rawItemId);
                      const hasBoxConfig = rItem && rItem.quantityPerBox > 0;

                      return (
                        <tr key={idx}>
                          <td data-label="Description" style={{ fontWeight: 600 }}>
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => {
                                const updated = [...deliveries];
                                updated[idx].name = e.target.value;
                                setDeliveries(updated);
                              }}
                              className="input-field"
                              style={{ height: '30px', fontSize: '0.8rem', background: 'rgba(0,0,0,0.2)' }}
                            />
                          </td>
                          <td data-label="Mapped Ingredient">
                            <select
                              value={item.rawItemId || ''}
                              onChange={(e) => {
                                const updated = [...deliveries];
                                const newRawId = e.target.value;
                                updated[idx].rawItemId = newRawId;
                                const newRaw = rawItems.find(r => r._id === newRawId);
                                updated[idx].name = newRaw?.name || updated[idx].name;
                                if (newRaw && newRaw.quantityPerBox > 0) {
                                  const currentQty = Number(updated[idx].boxesInput) || Number(updated[idx].piecesInput) || updated[idx].quantity || 0;
                                  updated[idx].boxesInput = String(currentQty);
                                  updated[idx].piecesInput = '0';
                                  updated[idx].quantity = currentQty * newRaw.quantityPerBox;
                                } else {
                                  const currentQty = Number(updated[idx].boxesInput) * (rItem?.quantityPerBox || 1) + (Number(updated[idx].piecesInput) || 0) || updated[idx].quantity || 0;
                                  updated[idx].boxesInput = '';
                                  updated[idx].piecesInput = String(currentQty);
                                  updated[idx].quantity = currentQty;
                                }
                                setDeliveries(updated);
                              }}
                              className="input-field"
                              style={{ height: '30px', fontSize: '0.8rem', background: 'rgba(0,0,0,0.2)' }}
                            >
                              <option value="">-- Select Ingredient --</option>
                              {rawItems.map(raw => (
                                <option key={raw._id} value={raw._id}>{raw.name} ({raw.unit})</option>
                              ))}
                            </select>
                          </td>
                          <td data-label="Date">
                            <select
                              value={item.date || endDate}
                              onChange={(e) => {
                                const updated = [...deliveries];
                                updated[idx].date = e.target.value;
                                setDeliveries(updated);
                              }}
                              className="input-field"
                              style={{ height: '30px', fontSize: '0.8rem', background: 'rgba(0,0,0,0.2)', width: '100%' }}
                            >
                              {getDatesInRange(startDate, endDate).map(d => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </td>
                          <td data-label="Qty">
                            {hasBoxConfig ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end' }}>
                                <input
                                  type="number"
                                  placeholder="Boxes"
                                  value={item.boxesInput ?? ''}
                                  onChange={(e) => {
                                    const updated = [...deliveries];
                                    updated[idx].boxesInput = e.target.value;
                                    const boxes = Number(e.target.value) || 0;
                                    const pieces = Number(updated[idx].piecesInput) || 0;
                                    updated[idx].quantity = (boxes * rItem.quantityPerBox) + pieces;
                                    setDeliveries(updated);
                                  }}
                                  className="input-field"
                                  style={{ maxWidth: '50px', height: '30px', fontSize: '0.75rem', textAlign: 'center', background: 'rgba(0,0,0,0.2)', padding: '0' }}
                                />
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>box +</span>
                                <input
                                  type="number"
                                  placeholder="Pcs"
                                  value={item.piecesInput ?? ''}
                                  onChange={(e) => {
                                    const updated = [...deliveries];
                                    updated[idx].piecesInput = e.target.value;
                                    const boxes = Number(updated[idx].boxesInput) || 0;
                                    const pieces = Number(e.target.value) || 0;
                                    updated[idx].quantity = (boxes * rItem.quantityPerBox) + pieces;
                                    setDeliveries(updated);
                                  }}
                                  className="input-field"
                                  style={{ maxWidth: '50px', height: '30px', fontSize: '0.75rem', textAlign: 'center', background: 'rgba(0,0,0,0.2)', padding: '0' }}
                                />
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>pcs</span>
                                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--primary)' }}>
                                  (= {item.quantity || 0})
                                </span>
                              </div>
                            ) : (
                              <input
                                type="number"
                                min="0"
                                value={item.quantity}
                                onChange={(e) => {
                                  const updated = [...deliveries];
                                  updated[idx].quantity = Number(e.target.value) || 0;
                                  updated[idx].piecesInput = e.target.value;
                                  setDeliveries(updated);
                                }}
                                className="input-field"
                                style={{ height: '30px', fontSize: '0.8rem', textAlign: 'right', background: 'rgba(0,0,0,0.2)' }}
                              />
                            )}
                          </td>
                          <td data-label="Price ($)">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.price}
                              onChange={(e) => {
                                const updated = [...deliveries];
                                updated[idx].price = Number(e.target.value) || 0;
                                setDeliveries(updated);
                              }}
                              className="input-field"
                              style={{ height: '30px', fontSize: '0.8rem', textAlign: 'right', background: 'rgba(0,0,0,0.2)' }}
                            />
                          </td>
                          <td data-label="Action" style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => setDeliveries(prev => prev.filter((_, i) => i !== idx))}
                              style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.25rem' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="button"
                className="btn btn-secondary" 
                onClick={() => {
                  setIsEditDeliveriesModalOpen(false);
                  setEditDeliveriesSearch('');
                  setEditDeliveriesSelectedId('');
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= EDIT SALES POPUP MODAL ================= */}
      {isEditSalesModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content card animate-fade-in" style={{ padding: '2rem', maxWidth: '750px', width: '90%', position: 'relative', background: 'rgba(18, 20, 26, 0.95)', backdropFilter: 'blur(20px)', border: 'var(--glass-border)' }}>
            <button 
              onClick={() => {
                setIsEditSalesModalOpen(false);
                setEditSalesSearch('');
              }} 
              style={{ position: 'absolute', right: '1.25rem', top: '1.25rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            
            <h2 className="form-label" style={{ fontSize: '1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Edit2 size={20} style={{ color: 'var(--primary)' }} /> Edit Loaded Sales Entries
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Modify recipe SKUs, menu item names, and quantities sold for the POS audit.
            </p>

            {/* Filter Search */}
            <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
              <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} size={16} />
              <input
                type="text"
                placeholder="Search by SKU or menu item name..."
                className="input-field"
                value={editSalesSearch}
                onChange={(e) => setEditSalesSearch(e.target.value)}
                style={{ paddingLeft: '34px', width: '100%', boxSizing: 'border-box', height: '36px', fontSize: '0.85rem' }}
              />
            </div>

            {/* Table Container */}
            <div className="table-container" style={{ maxHeight: '350px', overflowY: 'auto', marginBottom: '1.5rem' }}>
              {salesData.filter(item => {
                const search = editSalesSearch.toLowerCase();
                return item.sku.toLowerCase().includes(search) || item.name.toLowerCase().includes(search);
              }).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  No sales entries match the selected filters.
                </div>
              ) : (
                <table className="custom-table responsive-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>SKU / Code</th>
                      <th>Menu Product Name</th>
                      <th style={{ width: '100px', textAlign: 'right' }}>Qty Sold</th>
                      <th style={{ width: '100px', textAlign: 'right' }}>Price ($)</th>
                      <th style={{ width: '60px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesData.map((item, idx) => {
                      const search = editSalesSearch.toLowerCase();
                      if (!item.sku.toLowerCase().includes(search) && !item.name.toLowerCase().includes(search)) return null;

                      return (
                        <tr key={idx}>
                          <td data-label="SKU">
                            <select
                              value={item.sku || ''}
                              onChange={(e) => {
                                const updated = [...salesData];
                                updated[idx].sku = e.target.value;
                                const match = recipes.find(r => r.menuItemSku === e.target.value);
                                if (match) {
                                  updated[idx].name = match.menuItemName;
                                }
                                setSalesData(updated);
                              }}
                              className="input-field"
                              style={{ height: '30px', fontSize: '0.8rem', background: 'rgba(0,0,0,0.2)' }}
                            >
                              <option value="">-- No SKU --</option>
                              {recipes.map(rec => (
                                <option key={rec._id} value={rec.menuItemSku}>{rec.menuItemSku}</option>
                              ))}
                            </select>
                          </td>
                          <td data-label="Menu Product Name" style={{ fontWeight: 600 }}>
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => {
                                const updated = [...salesData];
                                updated[idx].name = e.target.value;
                                setSalesData(updated);
                              }}
                              className="input-field"
                              style={{ height: '30px', fontSize: '0.8rem', background: 'rgba(0,0,0,0.2)' }}
                            />
                          </td>
                          <td data-label="Qty Sold">
                            <input
                              type="number"
                              min="0"
                              value={item.quantitySold}
                              onChange={(e) => {
                                const updated = [...salesData];
                                updated[idx].quantitySold = Number(e.target.value) || 0;
                                setSalesData(updated);
                              }}
                              className="input-field"
                              style={{ height: '30px', fontSize: '0.8rem', textAlign: 'right', background: 'rgba(0,0,0,0.2)' }}
                            />
                          </td>
                          <td data-label="Price ($)">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.price}
                              onChange={(e) => {
                                const updated = [...salesData];
                                updated[idx].price = Number(e.target.value) || 0;
                                setSalesData(updated);
                              }}
                              className="input-field"
                              style={{ height: '30px', fontSize: '0.8rem', textAlign: 'right', background: 'rgba(0,0,0,0.2)' }}
                            />
                          </td>
                          <td data-label="Action" style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => setSalesData(prev => prev.filter((_, i) => i !== idx))}
                              style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.25rem' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="button"
                className="btn btn-secondary" 
                onClick={() => {
                  setIsEditSalesModalOpen(false);
                  setEditSalesSearch('');
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
