import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import RawMaterialForm from './RawMaterialForm';

export default function ProductsPage() {
  const [subTab, setSubTab] = useState('products');

  const [materials, setMaterials] = useState([]);
  const [products, setProducts] = useState([]);

  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const [productSearch, setProductSearch] = useState('');
  const [materialSearch, setMaterialSearch] = useState('');
  const [materialCategory, setMaterialCategory] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const [form, setForm] = useState({
    name: '',
    category: '',
    selling_price: '',
    output_qty: '1',
    recipe: [],
  });

  const loadMaterials = () =>
    api
      .get('/raw-materials')
      .then(setMaterials)
      .catch(() => setMaterials([]));

  const loadProducts = () =>
    api
      .get('/products')
      .then(setProducts)
      .catch(() => setProducts([]));

  useEffect(() => {
    loadMaterials();
    loadProducts();
  }, []);

  /* =====================================================
     CATEGORIES
     ===================================================== */

  const categories = useMemo(() => {
    const values = products
      .map((p) => p.category)
      .filter((c) => c && String(c).trim());

    return ['All', ...new Set(values)];
  }, [products]);

  /* =====================================================
     FILTER PRODUCTS
     ===================================================== */

  const filteredProducts = useMemo(() => {
    const search = productSearch.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !search ||
        String(product.name || '')
          .toLowerCase()
          .includes(search) ||
        String(product.category || '')
          .toLowerCase()
          .includes(search);

      const matchesCategory =
        selectedCategory === 'All' ||
        product.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [
    products,
    productSearch,
    selectedCategory,
  ]);

  /* =====================================================
     FILTER MATERIALS
     ===================================================== */

  const materialCategories = useMemo(() => {
    const values = materials.map((m) => m.category).filter((c) => c && String(c).trim());
    return ['All', ...new Set(values)].sort((a, b) => a === 'All' ? -1 : a.localeCompare(b));
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    const search = materialSearch.trim().toLowerCase();

    return materials.filter((material) => {
      const matchesCategory = materialCategory === 'All' || material.category === materialCategory;
      if (!matchesCategory) return false;
      if (!search) return true;

      return (
        String(material.name || '')
          .toLowerCase()
          .includes(search) ||
        String(material.category || '')
          .toLowerCase()
          .includes(search)
      );
    });
  }, [materials, materialSearch, materialCategory]);

  /* =====================================================
     MATERIAL ACTIONS
     ===================================================== */

  const removeMaterial = async (id) => {
    if (
      !window.confirm(
        'Remove this raw material?'
      )
    ) {
      return;
    }

    try {
      await api.del(`/raw-materials/${id}`);
      loadMaterials();
    } catch (err) {
      alert(err.message);
    }
  };

  const openNewMaterial = () => {
    setEditingMaterial(null);
    setShowMaterialForm(true);
  };

  /* =====================================================
     PRODUCT FORM
     ===================================================== */

  const openNewForm = () => {
    setEditing(null);

    setForm({
      name: '',
      category: '',
      selling_price: '',
      output_qty: '1',
      recipe: [],
    });

    setShowForm(true);
  };

  const openEditForm = (product) => {
    setEditing(product);

    setForm({
      name: product.name,
      category: product.category || '',
      selling_price: String(
        product.selling_price
      ),
      output_qty: String(
        product.output_qty || 1
      ),
      recipe: (product.recipe || []).map(
        (recipe) => ({
          raw_material_id:
            recipe.raw_material_id,
          quantity_required:
            recipe.quantity_required,
        })
      ),
    });

    setShowForm(true);
  };

  const addRecipeLine = () => {
    if (materials.length === 0) {
      alert('Add a raw material first');
      return;
    }

    setForm((current) => ({
      ...current,
      recipe: [
        ...current.recipe,
        {
          raw_material_id:
            materials[0].id,
          quantity_required: '',
        },
      ],
    }));
  };

  const updateRecipeLine = (
    index,
    field,
    value
  ) => {
    setForm((current) => {
      const recipe = [...current.recipe];

      recipe[index] = {
        ...recipe[index],
        [field]: value,
      };

      return {
        ...current,
        recipe,
      };
    });
  };

  const removeRecipeLine = (index) => {
    setForm((current) => ({
      ...current,
      recipe: current.recipe.filter(
        (_, i) => i !== index
      ),
    }));
  };

  const saveProduct = async () => {
    if (
      !form.name.trim() ||
      !form.selling_price
    ) {
      alert(
        'Name and selling price required'
      );
      return;
    }

    const body = {
      name: form.name.trim(),
      category:
        form.category.trim() || null,

      selling_price: Number(
        form.selling_price
      ),

      output_qty:
        Number(form.output_qty) || 1,

      recipe: form.recipe
        .filter(
          (recipe) =>
            recipe.raw_material_id &&
            recipe.quantity_required
        )
        .map((recipe) => ({
          raw_material_id: Number(
            recipe.raw_material_id
          ),
          quantity_required: Number(
            recipe.quantity_required
          ),
        })),
    };

    try {
      if (editing) {
        await api.put(
          `/products/${editing.id}`,
          body
        );
      } else {
        await api.post(
          '/products',
          body
        );
      }

      setShowForm(false);
      loadProducts();
    } catch (err) {
      alert(err.message);
    }
  };

  const removeProduct = async (id) => {
    if (
      !window.confirm(
        'Remove this product?'
      )
    ) {
      return;
    }

    try {
      await api.del(`/products/${id}`);
      loadProducts();
    } catch (err) {
      alert(err.message);
    }
  };

  /* =====================================================
     STATS
     ===================================================== */

  const lowStockMaterials = materials.filter(
    (material) =>
      Number(material.current_stock) <=
      Number(material.reorder_level)
  ).length;

  return (
    <div className="products-page">

      {/* =================================================
          HEADER
          ================================================= */}

      <div className="products-header">
        <div>
          <div className="products-breadcrumb">
            MASTERS / INVENTORY
          </div>

          <h1>Products & Recipes</h1>

          <p>
            Manage your products, recipes and
            raw materials
          </p>
        </div>

        <div className="products-header-stats">

          <div>
            <span>PRODUCTS</span>
            <strong>{products.length}</strong>
          </div>

          <div className="products-header-divider" />

          <div>
            <span>RAW MATERIALS</span>
            <strong>{materials.length}</strong>
          </div>

        </div>
      </div>

      {/* =================================================
          MAIN TABS
          ================================================= */}

      <div className="master-tabs">

        <button
          className={
            subTab === 'products'
              ? 'master-tab active'
              : 'master-tab'
          }
          onClick={() =>
            setSubTab('products')
          }
        >
          <span className="master-tab-icon">
            🍨
          </span>

          <span>
            <strong>Products & Recipes</strong>
            <small>
              {products.length} products
            </small>
          </span>
        </button>

        <button
          className={
            subTab === 'materials'
              ? 'master-tab active'
              : 'master-tab'
          }
          onClick={() =>
            setSubTab('materials')
          }
        >
          <span className="master-tab-icon">
            📦
          </span>

          <span>
            <strong>Raw Materials</strong>
            <small>
              {materials.length} materials
            </small>
          </span>
        </button>

      </div>

      {/* =================================================
          PRODUCTS TAB
          ================================================= */}

      {subTab === 'products' && (
        <div>

          {/* TOOLBAR */}

          <div className="master-toolbar">

            <div className="master-search">
              <span>⌕</span>

              <input
                placeholder="Search products..."
                value={productSearch}
                onChange={(e) =>
                  setProductSearch(
                    e.target.value
                  )
                }
              />

              {productSearch && (
                <button
                  onClick={() =>
                    setProductSearch('')
                  }
                >
                  ×
                </button>
              )}
            </div>

            <button
              className="btn master-add-btn"
              onClick={openNewForm}
            >
              + Add Product
            </button>

          </div>

          {/* CATEGORY FILTER */}

          <div className="category-filter-row">

            {categories.map((category) => (
              <button
                key={category}
                className={
                  selectedCategory ===
                  category
                    ? 'category-chip active'
                    : 'category-chip'
                }
                onClick={() =>
                  setSelectedCategory(
                    category
                  )
                }
              >
                {category}

                <span>
                  {category === 'All'
                    ? products.length
                    : products.filter(
                        (p) =>
                          p.category ===
                          category
                      ).length}
                </span>
              </button>
            ))}

          </div>

          {/* PRODUCT FORM */}

          {showForm && (
            <div className="product-form-card">

              <div className="product-form-header">

                <div>
                  <div className="form-eyebrow">
                    {editing
                      ? 'EDIT PRODUCT'
                      : 'NEW PRODUCT'}
                  </div>

                  <h3>
                    {editing
                      ? 'Edit Product'
                      : 'Create Product'}
                  </h3>

                  <p>
                    Add the selling details and
                    ingredients used for stock
                    deduction.
                  </p>
                </div>

                <button
                  className="form-close-btn"
                  onClick={() =>
                    setShowForm(false)
                  }
                >
                  ×
                </button>

              </div>

              <div className="product-form-fields">

                <div className="master-field large">
                  <label>Product Name</label>

                  <input
                    placeholder="e.g. Lotus Biscoff Milk Popsicle"
                    value={form.name}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        name: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="master-field">
                  <label>Category</label>

                  <input
                    placeholder="e.g. Popsicle"
                    value={form.category}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        category:
                          e.target.value,
                      })
                    }
                  />
                </div>

                <div className="master-field">
                  <label>Selling Price ₹</label>

                  <input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={
                      form.selling_price
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        selling_price:
                          e.target.value,
                      })
                    }
                  />
                </div>

                <div className="master-field">
                  <label>Batch Output</label>

                  <input
                    type="number"
                    min="1"
                    placeholder="1"
                    value={form.output_qty}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        output_qty:
                          e.target.value,
                      })
                    }
                  />

                  <small>
                    Number of units produced
                    per recipe batch
                  </small>
                </div>

              </div>

              {/* RECIPE */}

              <div className="recipe-builder">

                <div className="recipe-header">

                  <div>
                    <h4>
                      Recipe / Ingredients
                    </h4>

                    <p>
                      Ingredients required for
                      one batch
                    </p>
                  </div>

                  <span className="recipe-count">
                    {form.recipe.length}{' '}
                    ingredients
                  </span>

                </div>

                {form.recipe.length === 0 ? (
                  <div className="recipe-empty">

                    <div className="recipe-empty-icon">
                      🥄
                    </div>

                    <strong>
                      No ingredients added
                    </strong>

                    <span>
                      Add ingredients to
                      automatically deduct
                      stock when this product
                      is sold.
                    </span>

                    <button
                      className="btn btn-secondary"
                      onClick={
                        addRecipeLine
                      }
                    >
                      + Add Ingredient
                    </button>

                  </div>
                ) : (
                  <div className="recipe-lines">

                    {form.recipe.map(
                      (recipe, index) => {

                        const material =
                          materials.find(
                            (m) =>
                              Number(m.id) ===
                              Number(
                                recipe.raw_material_id
                              )
                          );

                        return (
                          <div
                            key={index}
                            className="recipe-line"
                          >

                            <div className="recipe-number">
                              {index + 1}
                            </div>

                            <div className="recipe-material">
                              <label>
                                Raw Material
                              </label>

                              <select
                                value={
                                  recipe.raw_material_id
                                }
                                onChange={(e) =>
                                  updateRecipeLine(
                                    index,
                                    'raw_material_id',
                                    e.target.value
                                  )
                                }
                              >
                                {materials.map(
                                  (material) => (
                                    <option
                                      key={
                                        material.id
                                      }
                                      value={
                                        material.id
                                      }
                                    >
                                      {
                                        material.name
                                      }{' '}
                                      (
                                      {
                                        material.unit
                                      }
                                      )
                                    </option>
                                  )
                                )}
                              </select>
                            </div>

                            <div className="recipe-quantity">
                              <label>
                                Quantity
                              </label>

                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0"
                                value={
                                  recipe.quantity_required
                                }
                                onChange={(e) =>
                                  updateRecipeLine(
                                    index,
                                    'quantity_required',
                                    e.target.value
                                  )
                                }
                              />

                              {material && (
                                <small>
                                  Unit:{' '}
                                  {
                                    material.unit
                                  }
                                </small>
                              )}
                            </div>

                            <button
                              className="recipe-remove"
                              onClick={() =>
                                removeRecipeLine(
                                  index
                                )
                              }
                            >
                              ×
                            </button>

                          </div>
                        );
                      }
                    )}

                  </div>
                )}

                {form.recipe.length > 0 && (
                  <button
                    className="add-recipe-btn"
                    onClick={
                      addRecipeLine
                    }
                  >
                    + Add Another Ingredient
                  </button>
                )}

              </div>

              {/* FORM ACTIONS */}

              <div className="product-form-actions">

                <button
                  className="btn btn-secondary"
                  onClick={() =>
                    setShowForm(false)
                  }
                >
                  Cancel
                </button>

                <button
                  className="btn"
                  onClick={saveProduct}
                >
                  {editing
                    ? 'Save Changes'
                    : 'Create Product'}
                </button>

              </div>

            </div>
          )}

          {/* PRODUCT LIST */}

          <div className="master-list-header">

            <div>
              <h3>
                Products
              </h3>

              <span>
                Showing{' '}
                {filteredProducts.length} of{' '}
                {products.length}
              </span>
            </div>

          </div>

          {filteredProducts.length === 0 ? (
            <div className="master-empty">

              <div className="master-empty-icon">
                🍨
              </div>

              <strong>
                {products.length === 0
                  ? 'No products yet'
                  : 'No products found'}
              </strong>

              <span>
                {products.length === 0
                  ? 'Create your first product to start billing.'
                  : 'Try changing your search or category.'}
              </span>

              {products.length === 0 && (
                <button
                  className="btn"
                  onClick={
                    openNewForm
                  }
                >
                  + Add Product
                </button>
              )}

            </div>
          ) : (
            <div className="products-grid">

              {filteredProducts.map(
                (product) => (
                  <div
                    key={product.id}
                    className="product-master-card"
                  >

                    <div className="product-card-top">

                      <div className="product-card-icon">
                        🍨
                      </div>

                      <div className="product-card-actions">

                        <button
                          onClick={() =>
                            openEditForm(
                              product
                            )
                          }
                        >
                          Edit
                        </button>

                        <button
                          className="danger"
                          onClick={() =>
                            removeProduct(
                              product.id
                            )
                          }
                        >
                          Remove
                        </button>

                      </div>

                    </div>

                    <div className="product-card-info">

                      <h3>
                        {product.name}
                      </h3>

                      <div className="product-card-meta">

                        {product.category && (
                          <span className="product-category">
                            {product.category}
                          </span>
                        )}

                        <strong>
                          ₹
                          {Number(
                            product.selling_price
                          ).toFixed(2)}
                        </strong>

                      </div>

                    </div>

                    <div className="product-card-recipe">

                      <div className="recipe-summary-header">
                        <span>
                          RECIPE
                        </span>

                        <span>
                          {product.recipe?.length ||
                            0}{' '}
                          items
                        </span>
                      </div>

                      {product.recipe?.length >
                      0 ? (
                        <div className="recipe-summary-list">

                          {product.recipe
                            .slice(0, 4)
                            .map(
                              (
                                recipe,
                                index
                              ) => (
                                <div
                                  key={
                                    index
                                  }
                                  className="recipe-summary-row"
                                >
                                  <span>
                                    {
                                      recipe.raw_material_name
                                    }
                                  </span>

                                  <strong>
                                    {
                                      recipe.quantity_required
                                    }
                                    {
                                      recipe.unit
                                    }
                                  </strong>
                                </div>
                              )
                            )}

                          {product.recipe.length >
                            4 && (
                            <div className="recipe-more">
                              +
                              {product.recipe.length -
                                4}{' '}
                              more ingredients
                            </div>
                          )}

                        </div>
                      ) : (
                        <div className="no-recipe">
                          <span>
                            No recipe configured
                          </span>
                        </div>
                      )}

                    </div>

                    <div className="product-card-footer">

                      <span>
                        Batch output
                      </span>

                      <strong>
                        {product.output_qty ||
                          1}{' '}
                        unit
                        {Number(
                          product.output_qty ||
                            1
                        ) !== 1
                          ? 's'
                          : ''}
                      </strong>

                    </div>

                  </div>
                )
              )}

            </div>
          )}

        </div>
      )}

      {/* =================================================
          RAW MATERIALS TAB
          ================================================= */}

      {subTab === 'materials' && (
        <div>

          <div className="master-toolbar">

            <div className="master-search">
              <span>⌕</span>

              <input
                placeholder="Search raw materials..."
                value={materialSearch}
                onChange={(e) =>
                  setMaterialSearch(
                    e.target.value
                  )
                }
              />

              {materialSearch && (
                <button
                  onClick={() =>
                    setMaterialSearch('')
                  }
                >
                  ×
                </button>
              )}
            </div>

            <button
              className="btn master-add-btn"
              onClick={openNewMaterial}
            >
              + Add Raw Material
            </button>

          </div>

          {/* CATEGORY FILTER */}

          <div className="category-filter-row">
            {materialCategories.map((category) => (
              <button
                key={category}
                className={materialCategory === category ? 'category-chip active' : 'category-chip'}
                onClick={() => setMaterialCategory(category)}
              >
                {category}
                <span>
                  {category === 'All' ? materials.length : materials.filter((m) => m.category === category).length}
                </span>
              </button>
            ))}
          </div>

          {/* MATERIAL SUMMARY */}

          <div className="material-summary-grid">

            <div className="material-summary-card">
              <span>Total Materials</span>
              <strong>
                {materials.length}
              </strong>
            </div>

            <div className="material-summary-card">
              <span>Low Stock</span>
              <strong className="danger-text">
                {lowStockMaterials}
              </strong>
            </div>

            <div className="material-summary-card">
              <span>Healthy Stock</span>
              <strong className="success-text">
                {materials.length -
                  lowStockMaterials}
              </strong>
            </div>

          </div>

          {showMaterialForm && (
            <div className="material-form-wrapper">

              <RawMaterialForm
                editing={editingMaterial}
                onSaved={() => {
                  setShowMaterialForm(
                    false
                  );
                  loadMaterials();
                }}
                onCancel={() =>
                  setShowMaterialForm(
                    false
                  )
                }
              />

            </div>
          )}

          <div className="master-list-header">

            <div>
              <h3>
                Raw Materials
              </h3>

              <span>
                Showing{' '}
                {filteredMaterials.length}{' '}
                of {materials.length}
              </span>
            </div>

          </div>

          {filteredMaterials.length === 0 ? (
            <div className="master-empty">

              <div className="master-empty-icon">
                📦
              </div>

              <strong>
                {materials.length === 0
                  ? 'No raw materials yet'
                  : 'No materials found'}
              </strong>

              <span>
                {materials.length === 0
                  ? 'Add the ingredients and materials used in your recipes.'
                  : 'Try a different search.'}
              </span>

            </div>
          ) : (
            <div className="materials-list">

              {filteredMaterials.map(
                (material) => {

                  const current =
                    Number(
                      material.current_stock
                    );

                  const reorder =
                    Number(
                      material.reorder_level
                    );

                  const isLow =
                    current <= reorder;

                  return (
                    <div
                      key={material.id}
                      className={
                        isLow
                          ? 'material-card low'
                          : 'material-card'
                      }
                    >

                      <div className="material-icon">
                        📦
                      </div>

                      <div className="material-main">

                        <div className="material-name-row">

                          <h3>
                            {material.name}
                          </h3>

                          {material.category &&
                            material.category !==
                              'Uncategorized' && (
                              <span>
                                {
                                  material.category
                                }
                              </span>
                            )}

                          {isLow && (
                            <b className="material-low-badge">
                              LOW STOCK
                            </b>
                          )}

                        </div>

                        <div className="material-stock-row">

                          <strong>
                            {current.toFixed(
                              2
                            )}{' '}
                            {material.unit}
                          </strong>

                          <span>
                            Reorder at{' '}
                            {reorder}{' '}
                            {material.unit}
                          </span>

                        </div>

                      </div>

                      <div className="material-actions">

                        <button
                          className="btn btn-secondary"
                          onClick={() => {
                            setEditingMaterial(
                              material
                            );
                            setShowMaterialForm(
                              true
                            );
                          }}
                        >
                          Edit
                        </button>

                        <button
                          className="material-remove"
                          onClick={() =>
                            removeMaterial(
                              material.id
                            )
                          }
                        >
                          Remove
                        </button>

                      </div>

                    </div>
                  );
                }
              )}

            </div>
          )}

        </div>
      )}

    </div>
  );
}