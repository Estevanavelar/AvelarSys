--
-- PostgreSQL database dump
--

\restrict P2PK0STH8X8XrmOY4bjSRdDCbAfXJLAKuLMcnbj0eDkmDhUwAcuSpW7WdvOHxdK

-- Dumped from database version 15.8
-- Dumped by pg_dump version 16.11 (Ubuntu 16.11-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: avelar_axcellos; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA avelar_axcellos;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: customer_devices; Type: TABLE; Schema: avelar_axcellos; Owner: -
--

CREATE TABLE avelar_axcellos.customer_devices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id character varying(14) NOT NULL,
    owner_cpf character varying(11) NOT NULL,
    customer_id character varying(11) NOT NULL,
    brand character varying(100) NOT NULL,
    model character varying(150) NOT NULL,
    device_label character varying(300) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: customers; Type: TABLE; Schema: avelar_axcellos; Owner: -
--

CREATE TABLE avelar_axcellos.customers (
    id character varying(11) NOT NULL,
    account_id character varying(14) NOT NULL,
    name character varying(255),
    whatsapp character varying(15),
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    last_sync_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE customers; Type: COMMENT; Schema: avelar_axcellos; Owner: -
--

COMMENT ON TABLE avelar_axcellos.customers IS 'Referências a clientes finais (client_type=cliente do AvAdmin). ID = CPF.';


--
-- Name: customers_backup_20260207; Type: TABLE; Schema: avelar_axcellos; Owner: -
--

CREATE TABLE avelar_axcellos.customers_backup_20260207 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id character varying(14) NOT NULL,
    customer_id character varying(14) NOT NULL,
    name character varying(255) NOT NULL,
    phone character varying(15),
    whatsapp character varying(15),
    email character varying(255),
    address jsonb,
    credit_limit numeric(10,2),
    current_debt numeric(10,2) DEFAULT 0.00,
    is_active boolean DEFAULT true NOT NULL,
    notes text,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: devices; Type: TABLE; Schema: avelar_axcellos; Owner: -
--

CREATE TABLE avelar_axcellos.devices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id character varying(14) NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(50) NOT NULL,
    device_id character varying(255) NOT NULL,
    push_token text,
    is_active boolean DEFAULT true NOT NULL,
    last_active_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    operator_cpf character varying(11),
    owner_cpf character varying(11)
);


--
-- Name: order_items; Type: TABLE; Schema: avelar_axcellos; Owner: -
--

CREATE TABLE avelar_axcellos.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity numeric(10,4) NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    discount numeric(10,2) DEFAULT 0.00,
    total_price numeric(10,2) NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: orders; Type: TABLE; Schema: avelar_axcellos; Owner: -
--

CREATE TABLE avelar_axcellos.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id character varying(14) NOT NULL,
    order_number character varying(50) NOT NULL,
    customer_id character varying(11),
    status character varying(50) DEFAULT 'draft'::character varying NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    discount numeric(10,2) DEFAULT 0.00,
    notes text,
    delivery_address jsonb,
    payment_method character varying(50),
    payment_status character varying(50) DEFAULT 'pending'::character varying,
    scheduled_for timestamp without time zone,
    delivered_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    operator_cpf character varying(11),
    owner_cpf character varying(11)
);


--
-- Name: COLUMN orders.operator_cpf; Type: COMMENT; Schema: avelar_axcellos; Owner: -
--

COMMENT ON COLUMN avelar_axcellos.orders.operator_cpf IS 'CPF do operador que criou a ordem (referência a users do AvAdmin)';


--
-- Name: products; Type: TABLE; Schema: avelar_axcellos; Owner: -
--

CREATE TABLE avelar_axcellos.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id character varying(14) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    sku character varying(100),
    barcode character varying(100),
    price numeric(10,2) NOT NULL,
    cost_price numeric(10,2),
    category character varying(100),
    unit character varying(20) DEFAULT 'unidade'::character varying,
    stock integer DEFAULT 0 NOT NULL,
    min_stock integer DEFAULT 0,
    max_stock integer,
    is_active boolean DEFAULT true NOT NULL,
    image_url text,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    owner_cpf character varying(11)
);


--
-- Name: report_data; Type: TABLE; Schema: avelar_axcellos; Owner: -
--

CREATE TABLE avelar_axcellos.report_data (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id character varying(14) NOT NULL,
    type character varying(50) NOT NULL,
    date timestamp without time zone NOT NULL,
    data jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    generated_by_cpf character varying(11)
);


--
-- Name: sale_items; Type: TABLE; Schema: avelar_axcellos; Owner: -
--

CREATE TABLE avelar_axcellos.sale_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sale_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity numeric(10,4) NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    discount numeric(10,2) DEFAULT 0.00,
    total_price numeric(10,2) NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: sales; Type: TABLE; Schema: avelar_axcellos; Owner: -
--

CREATE TABLE avelar_axcellos.sales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id character varying(14) NOT NULL,
    order_id uuid,
    customer_id character varying(11),
    total_amount numeric(10,2) NOT NULL,
    discount numeric(10,2) DEFAULT 0.00,
    payment_method character varying(50),
    payment_status character varying(50) DEFAULT 'paid'::character varying,
    items jsonb NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    operator_cpf character varying(11),
    owner_cpf character varying(11)
);


--
-- Name: COLUMN sales.operator_cpf; Type: COMMENT; Schema: avelar_axcellos; Owner: -
--

COMMENT ON COLUMN avelar_axcellos.sales.operator_cpf IS 'CPF do operador que realizou a venda (referência a users do AvAdmin)';


--
-- Name: settings; Type: TABLE; Schema: avelar_axcellos; Owner: -
--

CREATE TABLE avelar_axcellos.settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id character varying(14) NOT NULL,
    key character varying(255) NOT NULL,
    value jsonb,
    category character varying(100),
    is_public boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: avelar_axcellos; Owner: -
--

CREATE TABLE avelar_axcellos.users (
    id character varying(14) NOT NULL,
    business_name_deprecated character varying(255) DEFAULT ''::character varying,
    cnpj character varying(14),
    responsible_name character varying(255),
    whatsapp character varying(15),
    address text,
    city character varying(100),
    state character varying(2),
    zip_code character varying(8),
    status character varying(50) DEFAULT 'active'::character varying,
    client_type character varying(50),
    enabled_modules jsonb,
    settings jsonb,
    is_active boolean DEFAULT true NOT NULL,
    last_sync_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    document_type character varying(4),
    document character varying(14),
    owner_cpf character varying(11),
    is_individual boolean DEFAULT false,
    previous_document character varying(14),
    plan_id uuid,
    business_name character varying(255),
    company_name character varying(255)
);


--
-- Name: TABLE users; Type: COMMENT; Schema: avelar_axcellos; Owner: -
--

COMMENT ON TABLE avelar_axcellos.users IS 'Dados da empresa/loja (sincronizado de accounts do AvAdmin). ID = CNPJ.';


--
-- Name: COLUMN users.document_type; Type: COMMENT; Schema: avelar_axcellos; Owner: -
--

COMMENT ON COLUMN avelar_axcellos.users.document_type IS 'Tipo de documento: cpf ou cnpj';


--
-- Name: COLUMN users.document; Type: COMMENT; Schema: avelar_axcellos; Owner: -
--

COMMENT ON COLUMN avelar_axcellos.users.document IS 'Documento sem formatação (CPF ou CNPJ)';


--
-- Name: COLUMN users.owner_cpf; Type: COMMENT; Schema: avelar_axcellos; Owner: -
--

COMMENT ON COLUMN avelar_axcellos.users.owner_cpf IS 'CPF do dono da empresa (multi-tenancy)';


--
-- Name: COLUMN users.is_individual; Type: COMMENT; Schema: avelar_axcellos; Owner: -
--

COMMENT ON COLUMN avelar_axcellos.users.is_individual IS 'Pessoa física (true) ou jurídica (false)';


--
-- Name: COLUMN users.previous_document; Type: COMMENT; Schema: avelar_axcellos; Owner: -
--

COMMENT ON COLUMN avelar_axcellos.users.previous_document IS 'Documento anterior em caso de migração CPF→CNPJ';


--
-- Name: COLUMN users.business_name; Type: COMMENT; Schema: avelar_axcellos; Owner: -
--

COMMENT ON COLUMN avelar_axcellos.users.business_name IS 'Nome da empresa/loja';


--
-- Name: users_backup_20260207; Type: TABLE; Schema: avelar_axcellos; Owner: -
--

CREATE TABLE avelar_axcellos.users_backup_20260207 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id character varying(14) NOT NULL,
    full_name character varying(255) NOT NULL,
    cpf character varying(11) NOT NULL,
    whatsapp character varying(15) NOT NULL,
    role character varying(50) DEFAULT 'user'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    whatsapp_verified boolean DEFAULT false NOT NULL,
    last_login_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Data for Name: customer_devices; Type: TABLE DATA; Schema: avelar_axcellos; Owner: -
--

COPY avelar_axcellos.customer_devices (id, account_id, owner_cpf, customer_id, brand, model, device_label, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: avelar_axcellos; Owner: -
--

COPY avelar_axcellos.customers (id, account_id, name, whatsapp, notes, is_active, last_sync_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: customers_backup_20260207; Type: TABLE DATA; Schema: avelar_axcellos; Owner: -
--

COPY avelar_axcellos.customers_backup_20260207 (id, account_id, customer_id, name, phone, whatsapp, email, address, credit_limit, current_debt, is_active, notes, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: devices; Type: TABLE DATA; Schema: avelar_axcellos; Owner: -
--

COPY avelar_axcellos.devices (id, account_id, name, type, device_id, push_token, is_active, last_active_at, created_at, updated_at, operator_cpf, owner_cpf) FROM stdin;
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: avelar_axcellos; Owner: -
--

COPY avelar_axcellos.order_items (id, order_id, product_id, quantity, unit_price, discount, total_price, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: avelar_axcellos; Owner: -
--

COPY avelar_axcellos.orders (id, account_id, order_number, customer_id, status, total_amount, discount, notes, delivery_address, payment_method, payment_status, scheduled_for, delivered_at, created_at, updated_at, operator_cpf, owner_cpf) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: avelar_axcellos; Owner: -
--

COPY avelar_axcellos.products (id, account_id, name, description, sku, barcode, price, cost_price, category, unit, stock, min_stock, max_stock, is_active, image_url, metadata, created_at, updated_at, owner_cpf) FROM stdin;
\.


--
-- Data for Name: report_data; Type: TABLE DATA; Schema: avelar_axcellos; Owner: -
--

COPY avelar_axcellos.report_data (id, account_id, type, date, data, created_at, updated_at, generated_by_cpf) FROM stdin;
\.


--
-- Data for Name: sale_items; Type: TABLE DATA; Schema: avelar_axcellos; Owner: -
--

COPY avelar_axcellos.sale_items (id, sale_id, product_id, quantity, unit_price, discount, total_price, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sales; Type: TABLE DATA; Schema: avelar_axcellos; Owner: -
--

COPY avelar_axcellos.sales (id, account_id, order_id, customer_id, total_amount, discount, payment_method, payment_status, items, notes, created_at, updated_at, operator_cpf, owner_cpf) FROM stdin;
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: avelar_axcellos; Owner: -
--

COPY avelar_axcellos.settings (id, account_id, key, value, category, is_public, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: avelar_axcellos; Owner: -
--

COPY avelar_axcellos.users (id, business_name_deprecated, cnpj, responsible_name, whatsapp, address, city, state, zip_code, status, client_type, enabled_modules, settings, is_active, last_sync_at, created_at, updated_at, document_type, document, owner_cpf, is_individual, previous_document, plan_id, business_name, company_name) FROM stdin;
53685352000194		\N	\N	+5527988180948	Avenida Brasil	Vila Velha	ES	29127015	active	lojista	"[\\"StockTech\\",\\"AxCellOS\\"]"	\N	t	2026-02-23 18:00:06.977	2026-02-10 02:40:19.731	2026-02-23 18:00:06.977	cnpj	53685352000194	19131651755	f	\N	e6fc8bda-3ba8-4249-ab61-60ee3f046029	Avelar Company	\N
\.


--
-- Data for Name: users_backup_20260207; Type: TABLE DATA; Schema: avelar_axcellos; Owner: -
--

COPY avelar_axcellos.users_backup_20260207 (id, account_id, full_name, cpf, whatsapp, role, is_active, whatsapp_verified, last_login_at, created_at, updated_at) FROM stdin;
\.


--
-- Name: customer_devices customer_devices_pkey; Type: CONSTRAINT; Schema: avelar_axcellos; Owner: -
--

ALTER TABLE ONLY avelar_axcellos.customer_devices
    ADD CONSTRAINT customer_devices_pkey PRIMARY KEY (id);


--
-- Name: customers_backup_20260207 customers_customer_id_unique; Type: CONSTRAINT; Schema: avelar_axcellos; Owner: -
--

ALTER TABLE ONLY avelar_axcellos.customers_backup_20260207
    ADD CONSTRAINT customers_customer_id_unique UNIQUE (customer_id);


--
-- Name: customers_backup_20260207 customers_pkey; Type: CONSTRAINT; Schema: avelar_axcellos; Owner: -
--

ALTER TABLE ONLY avelar_axcellos.customers_backup_20260207
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey1; Type: CONSTRAINT; Schema: avelar_axcellos; Owner: -
--

ALTER TABLE ONLY avelar_axcellos.customers
    ADD CONSTRAINT customers_pkey1 PRIMARY KEY (id);


--
-- Name: devices devices_pkey; Type: CONSTRAINT; Schema: avelar_axcellos; Owner: -
--

ALTER TABLE ONLY avelar_axcellos.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: avelar_axcellos; Owner: -
--

ALTER TABLE ONLY avelar_axcellos.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: avelar_axcellos; Owner: -
--

ALTER TABLE ONLY avelar_axcellos.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: avelar_axcellos; Owner: -
--

ALTER TABLE ONLY avelar_axcellos.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_sku_unique; Type: CONSTRAINT; Schema: avelar_axcellos; Owner: -
--

ALTER TABLE ONLY avelar_axcellos.products
    ADD CONSTRAINT products_sku_unique UNIQUE (sku);


--
-- Name: report_data report_data_pkey; Type: CONSTRAINT; Schema: avelar_axcellos; Owner: -
--

ALTER TABLE ONLY avelar_axcellos.report_data
    ADD CONSTRAINT report_data_pkey PRIMARY KEY (id);


--
-- Name: sale_items sale_items_pkey; Type: CONSTRAINT; Schema: avelar_axcellos; Owner: -
--

ALTER TABLE ONLY avelar_axcellos.sale_items
    ADD CONSTRAINT sale_items_pkey PRIMARY KEY (id);


--
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: avelar_axcellos; Owner: -
--

ALTER TABLE ONLY avelar_axcellos.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (id);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: avelar_axcellos; Owner: -
--

ALTER TABLE ONLY avelar_axcellos.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: users users_cnpj_key; Type: CONSTRAINT; Schema: avelar_axcellos; Owner: -
--

ALTER TABLE ONLY avelar_axcellos.users
    ADD CONSTRAINT users_cnpj_key UNIQUE (cnpj);


--
-- Name: users_backup_20260207 users_cpf_unique; Type: CONSTRAINT; Schema: avelar_axcellos; Owner: -
--

ALTER TABLE ONLY avelar_axcellos.users_backup_20260207
    ADD CONSTRAINT users_cpf_unique UNIQUE (cpf);


--
-- Name: users_backup_20260207 users_pkey; Type: CONSTRAINT; Schema: avelar_axcellos; Owner: -
--

ALTER TABLE ONLY avelar_axcellos.users_backup_20260207
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey1; Type: CONSTRAINT; Schema: avelar_axcellos; Owner: -
--

ALTER TABLE ONLY avelar_axcellos.users
    ADD CONSTRAINT users_pkey1 PRIMARY KEY (id);


--
-- Name: customer_devices_account_id_idx; Type: INDEX; Schema: avelar_axcellos; Owner: -
--

CREATE INDEX customer_devices_account_id_idx ON avelar_axcellos.customer_devices USING btree (account_id);


--
-- Name: customer_devices_customer_active_idx; Type: INDEX; Schema: avelar_axcellos; Owner: -
--

CREATE INDEX customer_devices_customer_active_idx ON avelar_axcellos.customer_devices USING btree (customer_id, is_active);


--
-- Name: customer_devices_customer_id_idx; Type: INDEX; Schema: avelar_axcellos; Owner: -
--

CREATE INDEX customer_devices_customer_id_idx ON avelar_axcellos.customer_devices USING btree (customer_id);


--
-- Name: customer_devices_owner_cpf_idx; Type: INDEX; Schema: avelar_axcellos; Owner: -
--

CREATE INDEX customer_devices_owner_cpf_idx ON avelar_axcellos.customer_devices USING btree (owner_cpf);


--
-- Name: customer_devices_unique_per_customer_idx; Type: INDEX; Schema: avelar_axcellos; Owner: -
--

CREATE UNIQUE INDEX customer_devices_unique_per_customer_idx ON avelar_axcellos.customer_devices USING btree (account_id, customer_id, brand, model);


--
-- Name: devices_owner_cpf_idx; Type: INDEX; Schema: avelar_axcellos; Owner: -
--

CREATE INDEX devices_owner_cpf_idx ON avelar_axcellos.devices USING btree (owner_cpf);


--
-- Name: idx_customers_account_id; Type: INDEX; Schema: avelar_axcellos; Owner: -
--

CREATE INDEX idx_customers_account_id ON avelar_axcellos.customers USING btree (account_id);


--
-- Name: idx_orders_account_id; Type: INDEX; Schema: avelar_axcellos; Owner: -
--

CREATE INDEX idx_orders_account_id ON avelar_axcellos.orders USING btree (account_id);


--
-- Name: idx_orders_customer_id; Type: INDEX; Schema: avelar_axcellos; Owner: -
--

CREATE INDEX idx_orders_customer_id ON avelar_axcellos.orders USING btree (customer_id);


--
-- Name: idx_orders_operator_cpf; Type: INDEX; Schema: avelar_axcellos; Owner: -
--

CREATE INDEX idx_orders_operator_cpf ON avelar_axcellos.orders USING btree (operator_cpf);


--
-- Name: idx_products_account_id; Type: INDEX; Schema: avelar_axcellos; Owner: -
--

CREATE INDEX idx_products_account_id ON avelar_axcellos.products USING btree (account_id);


--
-- Name: idx_sales_account_id; Type: INDEX; Schema: avelar_axcellos; Owner: -
--

CREATE INDEX idx_sales_account_id ON avelar_axcellos.sales USING btree (account_id);


--
-- Name: idx_sales_customer_id; Type: INDEX; Schema: avelar_axcellos; Owner: -
--

CREATE INDEX idx_sales_customer_id ON avelar_axcellos.sales USING btree (customer_id);


--
-- Name: orders_owner_cpf_idx; Type: INDEX; Schema: avelar_axcellos; Owner: -
--

CREATE INDEX orders_owner_cpf_idx ON avelar_axcellos.orders USING btree (owner_cpf);


--
-- Name: products_owner_cpf_idx; Type: INDEX; Schema: avelar_axcellos; Owner: -
--

CREATE INDEX products_owner_cpf_idx ON avelar_axcellos.products USING btree (owner_cpf);


--
-- Name: sales_owner_cpf_idx; Type: INDEX; Schema: avelar_axcellos; Owner: -
--

CREATE INDEX sales_owner_cpf_idx ON avelar_axcellos.sales USING btree (owner_cpf);


--
-- Name: settings_account_id_key_idx; Type: INDEX; Schema: avelar_axcellos; Owner: -
--

CREATE UNIQUE INDEX settings_account_id_key_idx ON avelar_axcellos.settings USING btree (account_id, key);


--
-- Name: users_document_idx; Type: INDEX; Schema: avelar_axcellos; Owner: -
--

CREATE INDEX users_document_idx ON avelar_axcellos.users USING btree (document);


--
-- Name: users_owner_cpf_idx; Type: INDEX; Schema: avelar_axcellos; Owner: -
--

CREATE INDEX users_owner_cpf_idx ON avelar_axcellos.users USING btree (owner_cpf);


--
-- Name: customer_devices customer_devices_account_id_fkey; Type: FK CONSTRAINT; Schema: avelar_axcellos; Owner: -
--

ALTER TABLE ONLY avelar_axcellos.customer_devices
    ADD CONSTRAINT customer_devices_account_id_fkey FOREIGN KEY (account_id) REFERENCES avelar_axcellos.users(id);


--
-- Name: customer_devices customer_devices_customer_id_fkey; Type: FK CONSTRAINT; Schema: avelar_axcellos; Owner: -
--

ALTER TABLE ONLY avelar_axcellos.customer_devices
    ADD CONSTRAINT customer_devices_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES avelar_axcellos.customers(id);


--
-- Name: customers customers_account_id_fkey; Type: FK CONSTRAINT; Schema: avelar_axcellos; Owner: -
--

ALTER TABLE ONLY avelar_axcellos.customers
    ADD CONSTRAINT customers_account_id_fkey FOREIGN KEY (account_id) REFERENCES avelar_axcellos.users(id);


--
-- Name: order_items order_items_order_id_orders_id_fk; Type: FK CONSTRAINT; Schema: avelar_axcellos; Owner: -
--

ALTER TABLE ONLY avelar_axcellos.order_items
    ADD CONSTRAINT order_items_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES avelar_axcellos.orders(id);


--
-- Name: order_items order_items_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: avelar_axcellos; Owner: -
--

ALTER TABLE ONLY avelar_axcellos.order_items
    ADD CONSTRAINT order_items_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES avelar_axcellos.products(id);


--
-- Name: orders orders_customer_id_customers_customer_id_fk; Type: FK CONSTRAINT; Schema: avelar_axcellos; Owner: -
--

ALTER TABLE ONLY avelar_axcellos.orders
    ADD CONSTRAINT orders_customer_id_customers_customer_id_fk FOREIGN KEY (customer_id) REFERENCES avelar_axcellos.customers_backup_20260207(customer_id);


--
-- Name: sale_items sale_items_product_id_fkey; Type: FK CONSTRAINT; Schema: avelar_axcellos; Owner: -
--

ALTER TABLE ONLY avelar_axcellos.sale_items
    ADD CONSTRAINT sale_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES avelar_axcellos.products(id);


--
-- Name: sale_items sale_items_sale_id_fkey; Type: FK CONSTRAINT; Schema: avelar_axcellos; Owner: -
--

ALTER TABLE ONLY avelar_axcellos.sale_items
    ADD CONSTRAINT sale_items_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES avelar_axcellos.sales(id);


--
-- Name: sales sales_customer_id_customers_customer_id_fk; Type: FK CONSTRAINT; Schema: avelar_axcellos; Owner: -
--

ALTER TABLE ONLY avelar_axcellos.sales
    ADD CONSTRAINT sales_customer_id_customers_customer_id_fk FOREIGN KEY (customer_id) REFERENCES avelar_axcellos.customers_backup_20260207(customer_id);


--
-- Name: sales sales_order_id_orders_id_fk; Type: FK CONSTRAINT; Schema: avelar_axcellos; Owner: -
--

ALTER TABLE ONLY avelar_axcellos.sales
    ADD CONSTRAINT sales_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES avelar_axcellos.orders(id);


--
-- PostgreSQL database dump complete
--

\unrestrict P2PK0STH8X8XrmOY4bjSRdDCbAfXJLAKuLMcnbj0eDkmDhUwAcuSpW7WdvOHxdK

