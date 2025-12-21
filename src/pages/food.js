import { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useWorkout } from '@/context/WorkoutContext';
import Layout from '@/components/Layout';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Plus, Check, Minus, Pencil, Trash2, Utensils, ChevronDown } from 'lucide-react';
import ActivityHeatmap from '@/components/ActivityHeatmap';

const FOOD_ICONS = ['🥚', '🥤', '🍗', '🥩', '🐟', '🥛', '🍌', '🥜', '🍚', '🥦', '🍳', '🧀', '🍞', '💊'];
const FOOD_COLORS = ['#f59e0b', '#22c55e', '#ef4444', '#3b82f6', '#8b5cf6', '#14b8a6', '#ec4899', '#6366f1'];

export default function Food() {
  const router = useRouter();
  const {
    user,
    foodItems,
    todayFoodEntries,
    isLoading,
    today,
    createFoodItem,
    updateFoodItem,
    deleteFoodItem,
    toggleFoodEntry,
    updateFoodEntryQuantity,
    getFoodEntries,
  } = useWorkout();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showQuantityModal, setShowQuantityModal] = useState(null);
  const [tempQuantity, setTempQuantity] = useState(1);
  const [expandedItem, setExpandedItem] = useState(null);
  const [foodHeatmapData, setFoodHeatmapData] = useState({});
  
  const [newFood, setNewFood] = useState({
    name: '',
    icon: '🥚',
    color: '#f59e0b',
    unit: 'servings',
    default_quantity: 1,
    category: 'protein',
  });

  // Load heatmap data when item is expanded
  const loadFoodHeatmap = async (foodItemId) => {
    if (foodHeatmapData[foodItemId]) return;
    
    const endDate = today;
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);
    const startStr = formatDate(startDate);
    
    const entries = await getFoodEntries(startStr, endDate);
    const itemEntries = entries.filter(e => e.food_item_id === foodItemId);
    
    const byDate = {};
    itemEntries.forEach(entry => {
      byDate[entry.date] = entry.quantity || 1;
    });

    // Include today's entry
    if (todayFoodEntries[foodItemId]) {
      byDate[today] = todayFoodEntries[foodItemId].quantity || 1;
    }
    
    const data = Object.entries(byDate).map(([date, count]) => ({ date, count }));
    setFoodHeatmapData(prev => ({ ...prev, [foodItemId]: data }));
  };

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Stats
  const todayStats = useMemo(() => {
    const consumed = Object.keys(todayFoodEntries).length;
    return {
      consumed,
      total: foodItems.length,
      percentage: foodItems.length > 0 ? Math.round((consumed / foodItems.length) * 100) : 0,
    };
  }, [todayFoodEntries, foodItems]);

  const handleToggle = async (foodItem) => {
    const isConsumed = !!todayFoodEntries[foodItem.id];
    
    if (isConsumed) {
      // Remove entry
      await toggleFoodEntry(foodItem.id);
    } else {
      // Show quantity modal for items with quantities
      if (foodItem.unit && foodItem.default_quantity > 1) {
        setShowQuantityModal(foodItem);
        setTempQuantity(foodItem.default_quantity);
      } else {
        // Just toggle
        await toggleFoodEntry(foodItem.id, foodItem.default_quantity || 1);
      }
    }
    
    if (window.navigator?.vibrate) {
      window.navigator.vibrate(10);
    }
  };

  const handleQuantityConfirm = async () => {
    if (showQuantityModal) {
      await updateFoodEntryQuantity(showQuantityModal.id, tempQuantity);
      setShowQuantityModal(null);
    }
  };

  const handleSaveFood = async () => {
    if (!newFood.name.trim()) return;

    if (editingItem) {
      await updateFoodItem(editingItem.id, newFood);
    } else {
      await createFoodItem(newFood);
    }

    setShowAddModal(false);
    setEditingItem(null);
    setNewFood({
      name: '',
      icon: '🥚',
      color: '#f59e0b',
      unit: 'servings',
      default_quantity: 1,
      category: 'protein',
    });
  };

  const handleEditFood = (item) => {
    setEditingItem(item);
    setNewFood({
      name: item.name,
      icon: item.icon || '🥚',
      color: item.color || '#f59e0b',
      unit: item.unit || 'servings',
      default_quantity: item.default_quantity || 1,
      category: item.category || 'protein',
    });
    setShowAddModal(true);
  };

  const handleDeleteFood = async (id) => {
    if (confirm('Delete this food item?')) {
      await deleteFoodItem(id);
    }
  };

  const handleExpandItem = (itemId) => {
    if (expandedItem === itemId) {
      setExpandedItem(null);
    } else {
      setExpandedItem(itemId);
      loadFoodHeatmap(itemId);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin w-8 h-8 border-2 border-lift-primary border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
          <p className="text-iron-500 mb-4">Sign in to track food</p>
          <button
            onClick={() => router.push('/auth')}
            className="px-6 py-2.5 rounded-xl bg-lift-primary text-iron-950 font-bold"
          >
            Sign In
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-iron-100">Food Tracking</h2>
            <p className="text-iron-500 text-sm mt-1">
              {todayStats.consumed}/{todayStats.total} consumed today
            </p>
          </div>
          <button
            onClick={() => {
              setEditingItem(null);
              setNewFood({
                name: '',
                icon: '🥚',
                color: '#f59e0b',
                unit: 'servings',
                default_quantity: 1,
                category: 'protein',
              });
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/20 text-amber-400 font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Food
          </button>
        </div>

        {/* Progress Bar */}
        {foodItems.length > 0 && (
          <div className="mb-6 p-4 bg-iron-900/50 rounded-2xl">
            <div className="flex justify-between mb-2">
              <span className="text-iron-400 text-sm">Today's Progress</span>
              <span className="text-amber-400 font-medium">{todayStats.percentage}%</span>
            </div>
            <div className="h-2 bg-iron-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-300"
                style={{ width: `${todayStats.percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Food Items */}
        <div className="space-y-3">
          {foodItems.map(item => {
            const isConsumed = !!todayFoodEntries[item.id];
            const quantity = todayFoodEntries[item.id]?.quantity || item.default_quantity || 1;
            const isExpanded = expandedItem === item.id;
            const daysTracked = (foodHeatmapData[item.id] || []).length;

            return (
              <div 
                key={item.id} 
                className="bg-iron-900/50 rounded-2xl overflow-hidden"
              >
                <div className="p-4 flex items-center gap-3">
                  {/* Toggle Button */}
                  <button
                    onClick={() => handleToggle(item)}
                    className={`
                      w-14 h-14 rounded-xl flex items-center justify-center text-2xl
                      transition-all duration-200 active:scale-95
                      ${isConsumed 
                        ? 'shadow-lg' 
                        : 'bg-iron-800'
                      }
                    `}
                    style={{
                      backgroundColor: isConsumed ? item.color : undefined,
                    }}
                  >
                    {isConsumed ? (
                      <Check className="w-6 h-6 text-white" />
                    ) : (
                      item.icon
                    )}
                  </button>

                  {/* Item Info */}
                  <button 
                    className="flex-1 text-left"
                    onClick={() => handleExpandItem(item.id)}
                  >
                    <p className={`font-medium ${isConsumed ? 'text-iron-100' : 'text-iron-300'}`}>
                      {item.name}
                    </p>
                    <p className="text-iron-500 text-sm">
                      {isConsumed && (
                        <span className="text-amber-400">{quantity} {item.unit} · </span>
                      )}
                      {daysTracked > 0 ? `${daysTracked} days tracked` : 'Tap to log'}
                    </p>
                  </button>

                  {/* Quantity Adjuster (when consumed) */}
                  {isConsumed && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateFoodEntryQuantity(item.id, Math.max(0.5, quantity - 0.5))}
                        className="w-8 h-8 rounded-lg bg-iron-800 flex items-center justify-center"
                      >
                        <Minus className="w-4 h-4 text-iron-400" />
                      </button>
                      <span className="w-8 text-center text-iron-100 font-medium">{quantity}</span>
                      <button
                        onClick={() => updateFoodEntryQuantity(item.id, quantity + 0.5)}
                        className="w-8 h-8 rounded-lg bg-iron-800 flex items-center justify-center"
                      >
                        <Plus className="w-4 h-4 text-iron-400" />
                      </button>
                    </div>
                  )}

                  {/* Expand/Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditFood(item)}
                      className="p-2 text-iron-500 hover:text-iron-300"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <ChevronDown 
                      className={`w-5 h-5 text-iron-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      onClick={() => handleExpandItem(item.id)}
                    />
                  </div>
                </div>

                {/* Expanded Heatmap */}
                {isExpanded && (
                  <div className="px-4 pb-4">
                    <ActivityHeatmap
                      data={foodHeatmapData[item.id] || []}
                      type="habit"
                      label=""
                      color={item.color}
                      compact={true}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* Empty State */}
          {foodItems.length === 0 && (
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full p-8 rounded-2xl border-2 border-dashed border-iron-800 
                       flex flex-col items-center justify-center gap-3
                       hover:border-iron-700 active:bg-iron-900/50 transition-colors"
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center">
                <Utensils className="w-8 h-8 text-amber-400" />
              </div>
              <div className="text-center">
                <p className="text-iron-300 font-medium">Add your first food item</p>
                <p className="text-iron-600 text-sm mt-1">Track eggs, shakes, supplements...</p>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Add/Edit Food Modal */}
      <Drawer open={showAddModal} onOpenChange={setShowAddModal}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {editingItem ? 'Edit Food Item' : 'Add Food Item'}
            </DrawerTitle>
          </DrawerHeader>

          <div className="px-4 pb-4 space-y-4 overflow-y-auto max-h-[60vh]">
            {/* Name */}
            <div>
              <label className="block text-iron-400 text-sm mb-2">Name</label>
              <input
                type="text"
                value={newFood.name}
                onChange={(e) => setNewFood({ ...newFood, name: e.target.value })}
                placeholder="e.g., Eggs, Protein Shake"
                className="w-full h-12 px-4 rounded-xl bg-iron-800 text-iron-100 
                         placeholder-iron-600 outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            {/* Unit & Default Quantity */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-iron-400 text-sm mb-2">Unit</label>
                <input
                  type="text"
                  value={newFood.unit}
                  onChange={(e) => setNewFood({ ...newFood, unit: e.target.value })}
                  placeholder="servings, eggs, ml"
                  className="w-full h-12 px-4 rounded-xl bg-iron-800 text-iron-100 
                           placeholder-iron-600 outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-iron-400 text-sm mb-2">Default Qty</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={newFood.default_quantity}
                  onChange={(e) => setNewFood({ ...newFood, default_quantity: parseFloat(e.target.value) || 1 })}
                  className="w-full h-12 px-4 rounded-xl bg-iron-800 text-iron-100 
                           placeholder-iron-600 outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            </div>

            {/* Icon */}
            <div>
              <label className="block text-iron-400 text-sm mb-2">Icon</label>
              <div className="flex flex-wrap gap-2">
                {FOOD_ICONS.map(icon => (
                  <button
                    key={icon}
                    onClick={() => setNewFood({ ...newFood, icon })}
                    className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center
                      ${newFood.icon === icon 
                        ? 'bg-iron-700 ring-2 ring-amber-500' 
                        : 'bg-iron-800'
                      }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="block text-iron-400 text-sm mb-2">Color</label>
              <div className="flex flex-wrap gap-2">
                {FOOD_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewFood({ ...newFood, color })}
                    className={`w-10 h-10 rounded-xl transition-transform ${
                      newFood.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-iron-900 scale-110' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="p-4 bg-iron-800/50 rounded-xl">
              <p className="text-iron-500 text-xs mb-2">Preview</p>
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                  style={{ backgroundColor: newFood.color }}
                >
                  {newFood.icon}
                </div>
                <div>
                  <p className="text-iron-100 font-medium">{newFood.name || 'Food Name'}</p>
                  <p className="text-iron-500 text-sm">{newFood.default_quantity} {newFood.unit}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              {editingItem && (
                <button
                  onClick={() => {
                    handleDeleteFood(editingItem.id);
                    setShowAddModal(false);
                  }}
                  className="px-4 py-3 rounded-xl bg-red-500/20 text-red-400 font-medium"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-3 rounded-xl bg-iron-800 text-iron-400 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFood}
                disabled={!newFood.name.trim()}
                className="flex-1 py-3 rounded-xl bg-amber-500 text-iron-950 font-bold
                         disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                {editingItem ? 'Save' : 'Add'}
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Quantity Modal */}
      <Drawer open={!!showQuantityModal} onOpenChange={() => setShowQuantityModal(null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>How much?</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4 space-y-4">
            <div className="flex items-center justify-center gap-4 py-6">
              <button
                onClick={() => setTempQuantity(Math.max(0.5, tempQuantity - 0.5))}
                className="w-14 h-14 rounded-xl bg-iron-800 flex items-center justify-center"
              >
                <Minus className="w-6 h-6 text-iron-300" />
              </button>
              <div className="text-center w-24">
                <span className="text-4xl font-bold text-iron-100">{tempQuantity}</span>
                <p className="text-iron-500 text-sm">{showQuantityModal?.unit}</p>
              </div>
              <button
                onClick={() => setTempQuantity(tempQuantity + 0.5)}
                className="w-14 h-14 rounded-xl bg-iron-800 flex items-center justify-center"
              >
                <Plus className="w-6 h-6 text-iron-300" />
              </button>
            </div>
            <button
              onClick={handleQuantityConfirm}
              className="w-full py-4 rounded-xl bg-amber-500 text-iron-950 font-bold
                       flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              Log {tempQuantity} {showQuantityModal?.unit}
            </button>
          </div>
        </DrawerContent>
      </Drawer>
    </Layout>
  );
}

