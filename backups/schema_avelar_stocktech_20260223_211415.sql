--
-- PostgreSQL database dump
--

\restrict fn0deYoEfYAJd1zaaML87sUfdHIyTORYxHdME2wYQlpokmWOiQAwVdoz3ICVeKC

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
-- Name: avelar_stocktech; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA avelar_stocktech;


--
-- Name: client_type; Type: TYPE; Schema: avelar_stocktech; Owner: -
--

CREATE TYPE avelar_stocktech.client_type AS ENUM (
    'lojista',
    'distribuidor',
    'cliente_final'
);


--
-- Name: counterparty_role; Type: TYPE; Schema: avelar_stocktech; Owner: -
--

CREATE TYPE avelar_stocktech.counterparty_role AS ENUM (
    'buyer',
    'seller'
);


--
-- Name: document_type; Type: TYPE; Schema: avelar_stocktech; Owner: -
--

CREATE TYPE avelar_stocktech.document_type AS ENUM (
    'cpf',
    'cnpj'
);


--
-- Name: order_status; Type: TYPE; Schema: avelar_stocktech; Owner: -
--

CREATE TYPE avelar_stocktech.order_status AS ENUM (
    'pending_payment',
    'paid',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'awaiting_exchange',
    'exchange_completed',
    'exchange_rejected'
);


--
-- Name: product_condition; Type: TYPE; Schema: avelar_stocktech; Owner: -
--

CREATE TYPE avelar_stocktech.product_condition AS ENUM (
    'NEW',
    'USED',
    'REFURBISHED',
    'ORIGINAL_RETIRADA'
);


--
-- Name: return_status; Type: TYPE; Schema: avelar_stocktech; Owner: -
--

CREATE TYPE avelar_stocktech.return_status AS ENUM (
    'requested',
    'approved_replacement',
    'approved_refund',
    'rejected',
    'completed'
);


--
-- Name: role; Type: TYPE; Schema: avelar_stocktech; Owner: -
--

CREATE TYPE avelar_stocktech.role AS ENUM (
    'user',
    'admin'
);


--
-- Name: transaction_status; Type: TYPE; Schema: avelar_stocktech; Owner: -
--

CREATE TYPE avelar_stocktech.transaction_status AS ENUM (
    'completed',
    'pending',
    'cancelled'
);


--
-- Name: transaction_type; Type: TYPE; Schema: avelar_stocktech; Owner: -
--

CREATE TYPE avelar_stocktech.transaction_type AS ENUM (
    'sale',
    'purchase'
);


--
-- Name: warranty_period; Type: TYPE; Schema: avelar_stocktech; Owner: -
--

CREATE TYPE avelar_stocktech.warranty_period AS ENUM (
    'NONE',
    'DAYS_7',
    'DAYS_30',
    'DAYS_90',
    'MONTHS_6'
);


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: avelar_stocktech; Owner: -
--

CREATE FUNCTION avelar_stocktech.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: addresses; Type: TABLE; Schema: avelar_stocktech; Owner: -
--

CREATE TABLE avelar_stocktech.addresses (
    id integer NOT NULL,
    account_id character varying(14) NOT NULL,
    user_id character varying(11) NOT NULL,
    street character varying(255) NOT NULL,
    number character varying(20) NOT NULL,
    complement character varying(255),
    neighborhood character varying(100) NOT NULL,
    city character varying(100) NOT NULL,
    state character varying(2) NOT NULL,
    zip_code character varying(20) NOT NULL,
    country character varying(100) DEFAULT 'Brasil'::character varying NOT NULL,
    is_default integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: addresses_id_seq; Type: SEQUENCE; Schema: avelar_stocktech; Owner: -
--

CREATE SEQUENCE avelar_stocktech.addresses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: addresses_id_seq; Type: SEQUENCE OWNED BY; Schema: avelar_stocktech; Owner: -
--

ALTER SEQUENCE avelar_stocktech.addresses_id_seq OWNED BY avelar_stocktech.addresses.id;


--
-- Name: brands; Type: TABLE; Schema: avelar_stocktech; Owner: -
--

CREATE TABLE avelar_stocktech.brands (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    logo_url text,
    description text,
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: brands_id_seq; Type: SEQUENCE; Schema: avelar_stocktech; Owner: -
--

CREATE SEQUENCE avelar_stocktech.brands_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: brands_id_seq; Type: SEQUENCE OWNED BY; Schema: avelar_stocktech; Owner: -
--

ALTER SEQUENCE avelar_stocktech.brands_id_seq OWNED BY avelar_stocktech.brands.id;


--
-- Name: carts; Type: TABLE; Schema: avelar_stocktech; Owner: -
--

CREATE TABLE avelar_stocktech.carts (
    id integer NOT NULL,
    account_id character varying(14) NOT NULL,
    user_id character varying(11) NOT NULL,
    product_id integer NOT NULL,
    quantity integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    reserved_until timestamp without time zone,
    reserved_at timestamp without time zone DEFAULT now()
);


--
-- Name: carts_id_seq; Type: SEQUENCE; Schema: avelar_stocktech; Owner: -
--

CREATE SEQUENCE avelar_stocktech.carts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: carts_id_seq; Type: SEQUENCE OWNED BY; Schema: avelar_stocktech; Owner: -
--

ALTER SEQUENCE avelar_stocktech.carts_id_seq OWNED BY avelar_stocktech.carts.id;


--
-- Name: orders; Type: TABLE; Schema: avelar_stocktech; Owner: -
--

CREATE TABLE avelar_stocktech.orders (
    id integer NOT NULL,
    account_id character varying(14) NOT NULL,
    buyer_account_id character varying(14),
    seller_account_id character varying(14),
    buyer_id character varying(11) NOT NULL,
    seller_id character varying(11) NOT NULL,
    order_code character varying(20) NOT NULL,
    status avelar_stocktech.order_status DEFAULT 'pending_payment'::avelar_stocktech.order_status NOT NULL,
    subtotal numeric(12,2) NOT NULL,
    freight numeric(10,2) NOT NULL,
    total numeric(12,2) NOT NULL,
    address_id integer NOT NULL,
    items text NOT NULL,
    payment_notes text,
    payment_confirmed_at timestamp without time zone,
    payment_confirmed_by character varying(11),
    tracking_code character varying(50),
    tracking_carrier character varying(100),
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    parent_order_code character varying(20),
    owner_cpf character varying(11)
);


--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: avelar_stocktech; Owner: -
--

CREATE SEQUENCE avelar_stocktech.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: avelar_stocktech; Owner: -
--

ALTER SEQUENCE avelar_stocktech.orders_id_seq OWNED BY avelar_stocktech.orders.id;


--
-- Name: product_conditions; Type: TABLE; Schema: avelar_stocktech; Owner: -
--

CREATE TABLE avelar_stocktech.product_conditions (
    id integer NOT NULL,
    value character varying(50) NOT NULL,
    label character varying(100) NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: product_conditions_id_seq; Type: SEQUENCE; Schema: avelar_stocktech; Owner: -
--

CREATE SEQUENCE avelar_stocktech.product_conditions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_conditions_id_seq; Type: SEQUENCE OWNED BY; Schema: avelar_stocktech; Owner: -
--

ALTER SEQUENCE avelar_stocktech.product_conditions_id_seq OWNED BY avelar_stocktech.product_conditions.id;


--
-- Name: product_parts; Type: TABLE; Schema: avelar_stocktech; Owner: -
--

CREATE TABLE avelar_stocktech.product_parts (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: product_parts_id_seq; Type: SEQUENCE; Schema: avelar_stocktech; Owner: -
--

CREATE SEQUENCE avelar_stocktech.product_parts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_parts_id_seq; Type: SEQUENCE OWNED BY; Schema: avelar_stocktech; Owner: -
--

ALTER SEQUENCE avelar_stocktech.product_parts_id_seq OWNED BY avelar_stocktech.product_parts.id;


--
-- Name: product_returns; Type: TABLE; Schema: avelar_stocktech; Owner: -
--

CREATE TABLE avelar_stocktech.product_returns (
    id integer NOT NULL,
    account_id character varying(14) NOT NULL,
    buyer_id character varying(11) NOT NULL,
    seller_id character varying(11) NOT NULL,
    order_id integer NOT NULL,
    product_id integer NOT NULL,
    transaction_id integer,
    return_code character varying(20) NOT NULL,
    reason text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    status avelar_stocktech.return_status DEFAULT 'requested'::avelar_stocktech.return_status NOT NULL,
    seller_decision character varying(50),
    seller_notes text,
    approved_at timestamp without time zone,
    approved_by character varying(11),
    completed_at timestamp without time zone,
    rejected_at timestamp without time zone,
    rejection_reason text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    is_within_warranty boolean DEFAULT true NOT NULL,
    warranty_expires_at timestamp without time zone,
    owner_cpf character varying(11)
);


--
-- Name: product_returns_id_seq; Type: SEQUENCE; Schema: avelar_stocktech; Owner: -
--

CREATE SEQUENCE avelar_stocktech.product_returns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_returns_id_seq; Type: SEQUENCE OWNED BY; Schema: avelar_stocktech; Owner: -
--

ALTER SEQUENCE avelar_stocktech.product_returns_id_seq OWNED BY avelar_stocktech.product_returns.id;


--
-- Name: product_types; Type: TABLE; Schema: avelar_stocktech; Owner: -
--

CREATE TABLE avelar_stocktech.product_types (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: product_types_id_seq; Type: SEQUENCE; Schema: avelar_stocktech; Owner: -
--

CREATE SEQUENCE avelar_stocktech.product_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_types_id_seq; Type: SEQUENCE OWNED BY; Schema: avelar_stocktech; Owner: -
--

ALTER SEQUENCE avelar_stocktech.product_types_id_seq OWNED BY avelar_stocktech.product_types.id;


--
-- Name: products; Type: TABLE; Schema: avelar_stocktech; Owner: -
--

CREATE TABLE avelar_stocktech.products (
    id integer NOT NULL,
    account_id character varying(14) NOT NULL,
    created_by_user_id character varying(11),
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    brand character varying(100),
    model character varying(100),
    category character varying(100),
    description text,
    price numeric(10,2) NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    min_quantity integer DEFAULT 5 NOT NULL,
    condition avelar_stocktech.product_condition DEFAULT 'NEW'::avelar_stocktech.product_condition NOT NULL,
    images text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    product_type character varying(100),
    warranty_period avelar_stocktech.warranty_period DEFAULT 'NONE'::avelar_stocktech.warranty_period NOT NULL,
    defective_quantity integer DEFAULT 0 NOT NULL,
    owner_cpf character varying(11)
);


--
-- Name: products_id_seq; Type: SEQUENCE; Schema: avelar_stocktech; Owner: -
--

CREATE SEQUENCE avelar_stocktech.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: avelar_stocktech; Owner: -
--

ALTER SEQUENCE avelar_stocktech.products_id_seq OWNED BY avelar_stocktech.products.id;


--
-- Name: ratings; Type: TABLE; Schema: avelar_stocktech; Owner: -
--

CREATE TABLE avelar_stocktech.ratings (
    id integer NOT NULL,
    account_id character varying(14) NOT NULL,
    reviewer_id character varying(11) NOT NULL,
    product_id integer NOT NULL,
    transaction_id integer,
    rating integer NOT NULL,
    comment text,
    author character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: ratings_id_seq; Type: SEQUENCE; Schema: avelar_stocktech; Owner: -
--

CREATE SEQUENCE avelar_stocktech.ratings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ratings_id_seq; Type: SEQUENCE OWNED BY; Schema: avelar_stocktech; Owner: -
--

ALTER SEQUENCE avelar_stocktech.ratings_id_seq OWNED BY avelar_stocktech.ratings.id;


--
-- Name: seller_profiles; Type: TABLE; Schema: avelar_stocktech; Owner: -
--

CREATE TABLE avelar_stocktech.seller_profiles (
    id integer NOT NULL,
    account_id character varying(14) NOT NULL,
    user_id character varying(11) NOT NULL,
    store_name character varying(255) NOT NULL,
    email character varying(320),
    phone character varying(20),
    city character varying(100),
    state character varying(2),
    profile_photo text,
    cover_photo text,
    description text,
    rating numeric(3,2) DEFAULT '0'::numeric,
    total_sales integer DEFAULT 0 NOT NULL,
    total_sales_amount numeric(12,2) DEFAULT '0'::numeric,
    total_products integer DEFAULT 0 NOT NULL,
    total_reviews integer DEFAULT 0 NOT NULL,
    followers integer DEFAULT 0 NOT NULL,
    response_time integer,
    street character varying(255),
    number character varying(20),
    neighborhood character varying(100),
    zip_code character varying(20),
    latitude numeric(10,8),
    longitude numeric(11,8),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    owner_cpf character varying(11)
);


--
-- Name: seller_profiles_id_seq; Type: SEQUENCE; Schema: avelar_stocktech; Owner: -
--

CREATE SEQUENCE avelar_stocktech.seller_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: seller_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: avelar_stocktech; Owner: -
--

ALTER SEQUENCE avelar_stocktech.seller_profiles_id_seq OWNED BY avelar_stocktech.seller_profiles.id;


--
-- Name: transactions; Type: TABLE; Schema: avelar_stocktech; Owner: -
--

CREATE TABLE avelar_stocktech.transactions (
    id integer NOT NULL,
    account_id character varying(14) NOT NULL,
    buyer_id character varying(11) NOT NULL,
    seller_id character varying(11) NOT NULL,
    transaction_code character varying(50) NOT NULL,
    type avelar_stocktech.transaction_type NOT NULL,
    product_id integer NOT NULL,
    product_name character varying(255) NOT NULL,
    counterparty character varying(255) NOT NULL,
    counterparty_role avelar_stocktech.counterparty_role NOT NULL,
    amount numeric(12,2) NOT NULL,
    quantity integer NOT NULL,
    status avelar_stocktech.transaction_status DEFAULT 'pending'::avelar_stocktech.transaction_status NOT NULL,
    date timestamp without time zone DEFAULT now() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    owner_cpf character varying(11)
);


--
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: avelar_stocktech; Owner: -
--

CREATE SEQUENCE avelar_stocktech.transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: avelar_stocktech; Owner: -
--

ALTER SEQUENCE avelar_stocktech.transactions_id_seq OWNED BY avelar_stocktech.transactions.id;


--
-- Name: user_preferences; Type: TABLE; Schema: avelar_stocktech; Owner: -
--

CREATE TABLE avelar_stocktech.user_preferences (
    id integer NOT NULL,
    account_id character varying(14) NOT NULL,
    user_id character varying(11) NOT NULL,
    email_notifications boolean DEFAULT true NOT NULL,
    marketing_offers boolean DEFAULT true NOT NULL,
    data_sharing boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: user_preferences_id_seq; Type: SEQUENCE; Schema: avelar_stocktech; Owner: -
--

CREATE SEQUENCE avelar_stocktech.user_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: avelar_stocktech; Owner: -
--

ALTER SEQUENCE avelar_stocktech.user_preferences_id_seq OWNED BY avelar_stocktech.user_preferences.id;


--
-- Name: users; Type: TABLE; Schema: avelar_stocktech; Owner: -
--

CREATE TABLE avelar_stocktech.users (
    id character varying(14) NOT NULL,
    document_type avelar_stocktech.document_type DEFAULT 'cnpj'::avelar_stocktech.document_type NOT NULL,
    document character varying(14) NOT NULL,
    business_name character varying(200),
    owner_cpf character varying(11) NOT NULL,
    is_individual boolean DEFAULT false NOT NULL,
    whatsapp character varying(15),
    status character varying(20) DEFAULT 'trial'::character varying,
    enabled_modules jsonb DEFAULT '[]'::jsonb,
    previous_document character varying(14),
    plan_id uuid,
    client_type avelar_stocktech.client_type DEFAULT 'lojista'::avelar_stocktech.client_type NOT NULL,
    last_sync_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: users_backup_20260210; Type: TABLE; Schema: avelar_stocktech; Owner: -
--

CREATE TABLE avelar_stocktech.users_backup_20260210 (
    open_id character varying(64),
    name character varying(255),
    email character varying(320),
    login_method character varying(50),
    last_signed_in timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: addresses id; Type: DEFAULT; Schema: avelar_stocktech; Owner: -
--

ALTER TABLE ONLY avelar_stocktech.addresses ALTER COLUMN id SET DEFAULT nextval('avelar_stocktech.addresses_id_seq'::regclass);


--
-- Name: brands id; Type: DEFAULT; Schema: avelar_stocktech; Owner: -
--

ALTER TABLE ONLY avelar_stocktech.brands ALTER COLUMN id SET DEFAULT nextval('avelar_stocktech.brands_id_seq'::regclass);


--
-- Name: carts id; Type: DEFAULT; Schema: avelar_stocktech; Owner: -
--

ALTER TABLE ONLY avelar_stocktech.carts ALTER COLUMN id SET DEFAULT nextval('avelar_stocktech.carts_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: avelar_stocktech; Owner: -
--

ALTER TABLE ONLY avelar_stocktech.orders ALTER COLUMN id SET DEFAULT nextval('avelar_stocktech.orders_id_seq'::regclass);


--
-- Name: product_conditions id; Type: DEFAULT; Schema: avelar_stocktech; Owner: -
--

ALTER TABLE ONLY avelar_stocktech.product_conditions ALTER COLUMN id SET DEFAULT nextval('avelar_stocktech.product_conditions_id_seq'::regclass);


--
-- Name: product_parts id; Type: DEFAULT; Schema: avelar_stocktech; Owner: -
--

ALTER TABLE ONLY avelar_stocktech.product_parts ALTER COLUMN id SET DEFAULT nextval('avelar_stocktech.product_parts_id_seq'::regclass);


--
-- Name: product_returns id; Type: DEFAULT; Schema: avelar_stocktech; Owner: -
--

ALTER TABLE ONLY avelar_stocktech.product_returns ALTER COLUMN id SET DEFAULT nextval('avelar_stocktech.product_returns_id_seq'::regclass);


--
-- Name: product_types id; Type: DEFAULT; Schema: avelar_stocktech; Owner: -
--

ALTER TABLE ONLY avelar_stocktech.product_types ALTER COLUMN id SET DEFAULT nextval('avelar_stocktech.product_types_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: avelar_stocktech; Owner: -
--

ALTER TABLE ONLY avelar_stocktech.products ALTER COLUMN id SET DEFAULT nextval('avelar_stocktech.products_id_seq'::regclass);


--
-- Name: ratings id; Type: DEFAULT; Schema: avelar_stocktech; Owner: -
--

ALTER TABLE ONLY avelar_stocktech.ratings ALTER COLUMN id SET DEFAULT nextval('avelar_stocktech.ratings_id_seq'::regclass);


--
-- Name: seller_profiles id; Type: DEFAULT; Schema: avelar_stocktech; Owner: -
--

ALTER TABLE ONLY avelar_stocktech.seller_profiles ALTER COLUMN id SET DEFAULT nextval('avelar_stocktech.seller_profiles_id_seq'::regclass);


--
-- Name: transactions id; Type: DEFAULT; Schema: avelar_stocktech; Owner: -
--

ALTER TABLE ONLY avelar_stocktech.transactions ALTER COLUMN id SET DEFAULT nextval('avelar_stocktech.transactions_id_seq'::regclass);


--
-- Name: user_preferences id; Type: DEFAULT; Schema: avelar_stocktech; Owner: -
--

ALTER TABLE ONLY avelar_stocktech.user_preferences ALTER COLUMN id SET DEFAULT nextval('avelar_stocktech.user_preferences_id_seq'::regclass);


--
-- Data for Name: addresses; Type: TABLE DATA; Schema: avelar_stocktech; Owner: -
--

COPY avelar_stocktech.addresses (id, account_id, user_id, street, number, complement, neighborhood, city, state, zip_code, country, is_default, created_at, updated_at) FROM stdin;
7	32716071000181	13617126782	Rua Daniela Perez	615		Barramares	Vila Velha	ES	29124342	Brasil	1	2026-01-27 19:05:01.02156	2026-01-27 19:08:00.409
9	51276706000111	86552410590	Avenida LÍVIA FRANCISCHETTO SEBIM OLMO	282	RDG cell 	Barramares	Vila Velha	ES	29124376	Brasil	1	2026-01-30 13:32:14.700179	2026-01-30 13:32:14.700179
8	53685352000194	19131651755	Avenida Brasil	1406		João Goulart	Vila Velha	ES	29127015	Brasil	1	2026-01-28 14:05:03.874743	2026-01-30 21:28:50.093
\.


--
-- Data for Name: brands; Type: TABLE DATA; Schema: avelar_stocktech; Owner: -
--

COPY avelar_stocktech.brands (id, name, slug, logo_url, description, is_active, display_order, created_at, updated_at) FROM stdin;
1	Samsung	samsung	\N	\N	t	1	2026-02-05 17:19:36.124891+00	2026-02-05 17:19:36.124891+00
2	Motorola	motorola	\N	\N	t	2	2026-02-05 17:19:36.124891+00	2026-02-05 17:19:36.124891+00
3	Xiaomi	xiaomi	\N	\N	t	3	2026-02-05 17:19:36.124891+00	2026-02-05 17:19:36.124891+00
4	Realme	realme	\N	\N	t	4	2026-02-05 17:19:36.124891+00	2026-02-05 17:19:36.124891+00
5	Apple	apple	\N	\N	t	5	2026-02-05 17:19:36.124891+00	2026-02-05 17:19:36.124891+00
\.


--
-- Data for Name: carts; Type: TABLE DATA; Schema: avelar_stocktech; Owner: -
--

COPY avelar_stocktech.carts (id, account_id, user_id, product_id, quantity, created_at, updated_at, reserved_until, reserved_at) FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: avelar_stocktech; Owner: -
--

COPY avelar_stocktech.orders (id, account_id, buyer_account_id, seller_account_id, buyer_id, seller_id, order_code, status, subtotal, freight, total, address_id, items, payment_notes, payment_confirmed_at, payment_confirmed_by, tracking_code, tracking_carrier, notes, created_at, updated_at, parent_order_code, owner_cpf) FROM stdin;
\.


--
-- Data for Name: product_conditions; Type: TABLE DATA; Schema: avelar_stocktech; Owner: -
--

COPY avelar_stocktech.product_conditions (id, value, label, display_order, is_active, created_at, updated_at) FROM stdin;
1	NEW	Novo	1	t	2026-02-05 17:19:36.124891+00	2026-02-05 17:19:36.124891+00
2	USED	Usado	2	t	2026-02-05 17:19:36.124891+00	2026-02-05 17:19:36.124891+00
3	REFURBISHED	Recondicionado	3	t	2026-02-05 17:19:36.124891+00	2026-02-05 17:19:36.124891+00
4	ORIGINAL_RETIRADA	Original Retirada	4	t	2026-02-05 17:19:36.124891+00	2026-02-05 17:19:36.124891+00
\.


--
-- Data for Name: product_parts; Type: TABLE DATA; Schema: avelar_stocktech; Owner: -
--

COPY avelar_stocktech.product_parts (id, name, slug, display_order, is_active, description, created_at, updated_at) FROM stdin;
1	Câmera Frontal	camera-frontal	1	t	\N	2026-02-05 17:19:36.124891+00	2026-02-05 17:19:36.124891+00
2	Câmera Traseira	camera-traseira	2	t	\N	2026-02-05 17:19:36.124891+00	2026-02-05 17:19:36.124891+00
3	Aro	aro	3	t	\N	2026-02-05 17:19:36.124891+00	2026-02-05 17:19:36.124891+00
4	Biometria	biometria	4	t	\N	2026-02-05 17:19:36.124891+00	2026-02-05 17:19:36.124891+00
5	Flex Main	flex-main	5	t	\N	2026-02-05 17:19:36.124891+00	2026-02-05 17:19:36.124891+00
6	Flex Sub	flex-sub	6	t	\N	2026-02-05 17:19:36.124891+00	2026-02-05 17:19:36.124891+00
7	Flex Botão	flex-botao	7	t	\N	2026-02-05 17:19:36.124891+00	2026-02-05 17:19:36.124891+00
8	Tampa Traseira	tampa-traseira	8	t	\N	2026-02-05 17:19:36.124891+00	2026-02-05 17:19:36.124891+00
9	Alto-falante Auricular	alto-falante-auricular	9	t	\N	2026-02-05 17:19:36.124891+00	2026-02-05 17:19:36.124891+00
10	Alto-falante Principal	alto-falante-principal	10	t	\N	2026-02-05 17:19:36.124891+00	2026-02-05 17:19:36.124891+00
11	Tela	tela	11	t	\N	2026-02-05 17:19:36.124891+00	2026-02-05 17:19:36.124891+00
12	Bateria	bateria	12	t	\N	2026-02-05 17:19:36.124891+00	2026-02-05 17:19:36.124891+00
13	Conector de Carga	conector-de-carga	13	t	\N	2026-02-05 17:19:36.124891+00	2026-02-05 17:19:36.124891+00
14	Botão de Ligar	botao-de-ligar	14	t	\N	2026-02-05 17:19:36.124891+00	2026-02-05 17:19:36.124891+00
15	Botão de Volume	botao-de-volume	15	t	\N	2026-02-05 17:19:36.124891+00	2026-02-05 17:19:36.124891+00
16	Microfone	microfone	16	t	\N	2026-02-05 17:19:36.124891+00	2026-02-05 17:19:36.124891+00
17	Vibrador	vibrador	17	t	\N	2026-02-05 17:19:36.124891+00	2026-02-05 17:19:36.124891+00
18	Carcaça	carcaca	18	t	\N	2026-02-05 17:19:36.124891+00	2026-02-05 17:19:36.124891+00
19	Vidro Traseiro	vidro-traseiro	19	t	\N	2026-02-05 17:19:36.124891+00	2026-02-05 17:19:36.124891+00
20	Fone de Ouvido	fone-de-ouvido	20	t	\N	2026-02-05 17:19:36.124891+00	2026-02-05 17:19:36.124891+00
21	Cabo USB	cabo-usb	21	t	\N	2026-02-05 17:19:36.124891+00	2026-02-05 17:19:36.124891+00
22	Carregador	carregador	22	t	\N	2026-02-05 17:19:36.124891+00	2026-02-05 17:19:36.124891+00
\.


--
-- Data for Name: product_returns; Type: TABLE DATA; Schema: avelar_stocktech; Owner: -
--

COPY avelar_stocktech.product_returns (id, account_id, buyer_id, seller_id, order_id, product_id, transaction_id, return_code, reason, quantity, status, seller_decision, seller_notes, approved_at, approved_by, completed_at, rejected_at, rejection_reason, created_at, updated_at, is_within_warranty, warranty_expires_at, owner_cpf) FROM stdin;
\.


--
-- Data for Name: product_types; Type: TABLE DATA; Schema: avelar_stocktech; Owner: -
--

COPY avelar_stocktech.product_types (id, name, slug, display_order, is_active, description, created_at, updated_at) FROM stdin;
1	Smartphone	smartphone	1	t	Smartphones e celulares	2026-02-05 17:19:36.124891+00	2026-02-05 17:19:36.124891+00
2	Tablet	tablet	2	t	Tablets e iPads	2026-02-05 17:19:36.124891+00	2026-02-05 17:19:36.124891+00
3	Notebook	notebook	3	t	Notebooks e laptops	2026-02-05 17:19:36.124891+00	2026-02-05 17:19:36.124891+00
4	Smartwatch	smartwatch	4	t	Relógios inteligentes	2026-02-05 17:19:36.124891+00	2026-02-05 17:19:36.124891+00
5	Fone de Ouvido	fone-de-ouvido	5	t	Fones e headsets	2026-02-05 17:19:36.124891+00	2026-02-05 17:19:36.124891+00
6	Outro	outro	99	t	Outros tipos de produtos	2026-02-05 17:19:36.124891+00	2026-02-05 17:19:36.124891+00
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: avelar_stocktech; Owner: -
--

COPY avelar_stocktech.products (id, account_id, created_by_user_id, code, name, brand, model, category, description, price, quantity, min_quantity, condition, images, created_at, updated_at, product_type, warranty_period, defective_quantity, owner_cpf) FROM stdin;
16	53685352000194	19131651755	PRODAQQ826	Flex A50 sub	Samsung	A50	Flex Sub		20.00	1	0	NEW	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769797762855-17697977441352897128593167181177.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769797946899-17697979338847526157902893520539.webp"]	2026-01-30 18:36:47.498692	2026-01-30 18:36:47.498692	\N	NONE	0	19131651755
20	53685352000194	19131651755	PRODOEF504	Conector A11	Samsung	A11	Conector de Carga		20.00	13	0	NEW	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769800171847-1769800128859831387508508058508.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769800195661-17698001779217905352378220800686.webp"]	2026-01-30 19:10:55.192962	2026-01-31 13:43:52.591	\N	NONE	0	19131651755
52	53685352000194	19131651755	PRODACE613	Conector A14 5G	Samsung	A14 5G	Conector de Carga		20.00	1	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769875970158-17698759154152580725854353061315.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769876033539-1769875974411601798158495341763.webp"]	2026-01-31 16:14:39.683854	2026-01-31 16:14:39.683854	\N	NONE	0	19131651755
112	53685352000194	19131651755	PRODFRJ314	Biometria A31	Samsung	A31	Biometria		25.00	1	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770131854195-17701318237569125116557300265575.webp"]	2026-02-03 15:19:05.24257	2026-02-03 15:19:05.24257	\N	NONE	0	19131651755
113	53685352000194	19131651755	PRODAWB957	Câmera traseira A03 Core	Samsung	A03 CORE	Câmera Traseira		25.00	1	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770132061148-17701320289601243785631127606565.webp"]	2026-02-03 15:21:50.227734	2026-02-03 15:21:50.227734	\N	NONE	0	19131651755
114	53685352000194	19131651755	PRODQBT801	Câmera frontal A03 Core	Samsung	A03 CORE	Câmera Frontal		25.00	1	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770132142905-17701321172871283548758969296013.webp"]	2026-02-03 15:23:14.824875	2026-02-03 15:23:14.824875	\N	NONE	0	19131651755
121	32716071000181	13617126782	PRODRPY405	Conector de carga Note 9s/9Pro	Xiaomi	NOTE 9S / 9PRO	Conector de Carga	Conector de carga do xiomi note 9s e note 9pro	35.00	1	1	NEW	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770657654350-note_9s.webp"]	2026-02-09 17:23:35.270785	2026-02-09 17:23:35.270785	Smartphone	DAYS_90	0	13617126782
17	53685352000194	19131651755	PRODBPB062	Flex A50 Main	Samsung	A50 	Flex Main		20.00	2	0	NEW	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769799002354-17697989882643708964260948058529.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769799023230-17697990109348413514547193403110.webp"]	2026-01-30 18:51:21.014578	2026-01-30 18:51:21.014578	\N	NONE	0	19131651755
18	53685352000194	19131651755	PRODTLJ377	Flex A30 Sub	Samsung	A30	Flex Sub		20.00	3	0	NEW	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769799131683-17697991165855532355033932581528.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769799154344-1769799139680875865767428033593.webp"]	2026-01-30 18:56:36.113367	2026-01-30 18:56:36.113367	\N	NONE	0	19131651755
19	53685352000194	19131651755	PRODLCH988	Flex  A10 Sub	Samsung	A10	Flex Sub		20.00	11	0	NEW	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769799623363-17697996117016922402142199029217.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769799645433-17697996321952918494264947647974.webp"]	2026-01-30 19:03:38.490055	2026-01-30 19:03:38.490055	\N	NONE	0	19131651755
21	53685352000194	19131651755	PRODWLT911	Flex A51 Sub	Samsung	A51	Flex Sub		20.00	2	0	NEW	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769800346978-17698003201994240595875870408668.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769800430930-17698004071666970557346511283774.webp"]	2026-01-30 19:14:47.28521	2026-01-30 19:14:47.28521	\N	NONE	0	19131651755
28	53685352000194	19131651755	PRODGZO514	Conector A70	Samsung	A70	Conector de Carga		20.00	7	0	NEW	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769804262181-1769804240388618220070553053577.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769804285949-17698042669282004724886932172781.webp"]	2026-01-30 20:23:30.286157	2026-01-30 22:18:30.415	\N	NONE	0	19131651755
12	53685352000194	19131651755	PRODTWI499	Conector A10	Samsung	A10	Conector de Carga		20.00	14	0	NEW	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769785468316-17697854521502640634987894617579.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769785489016-17697854745917079291354153754313.webp"]	2026-01-30 15:05:41.495195	2026-01-31 13:22:50.207	\N	NONE	0	19131651755
22	53685352000194	19131651755	PRODNLB740	Flex A71 Main	Samsung	A71	Flex Main		20.00	1	0	NEW	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769800676705-17698006622824339040483222912700.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769800750238-17698006823728241479660493491904.webp"]	2026-01-30 19:19:56.517477	2026-01-30 19:32:47.996	\N	NONE	0	19131651755
33	53685352000194	19131651755	PRODRLY068	Conector A01	Samsung	A01	Conector de Carga		20.00	3	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769866914210-17698669013602527640972188943748.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769866932889-17698669207138655405753376748018.webp"]	2026-01-31 13:42:49.001396	2026-01-31 13:42:49.001396	\N	NONE	0	19131651755
26	53685352000194	19131651755	PRODQBO966	Conector A21 M13	Samsung	A21 M13	Conector de Carga		20.00	5	0	NEW	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769802787584-17698027711235214015311350623255.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769802832740-17698027931251013088810595814421.webp"]	2026-01-30 19:54:32.597482	2026-01-31 00:30:56.095	\N	NONE	0	19131651755
27	53685352000194	19131651755	PRODRKG581	Conector A20s M12	Samsung	A20S M12	Conector de Carga		20.00	2	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769803461021-17698034252715599650412246351533.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769803477955-1769803466429489560231643729922.webp"]	2026-01-30 20:05:32.295379	2026-01-31 13:35:14.408	\N	NONE	0	19131651755
25	53685352000194	19131651755	PRODPEF316	Conector A10s M16	Samsung	A10S M16	Conector de Carga		20.00	3	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769802021097-17698020113495771022212164357749.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769802042503-17698020288715628508906041223324.webp"]	2026-01-30 19:42:07.996261	2026-01-30 22:18:33.517	\N	NONE	0	19131651755
23	53685352000194	19131651755	PRODMOQ876	Flex A20 Main	Samsung	A20	Flex Main		20.00	4	0	NEW	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769801018857-17698010042562788818979769809676.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769801035884-17698010242076165690754080429738.webp"]	2026-01-30 19:24:42.707092	2026-01-30 22:18:34.898	\N	NONE	0	19131651755
30	53685352000194	19131651755	PRODWTL550	Flex A30s Main	Samsung	A30S	Flex Main		20.00	6	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769864499243-17698644650657463605026457163893.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769864517969-17698645072964734257711706649405.webp"]	2026-01-31 13:03:07.814968	2026-01-31 13:11:15.796	\N	NONE	0	19131651755
24	53685352000194	19131651755	PRODSAH062	Flex A34 e A54 Main	Samsung	A34 	Flex Main		20.00	1	0	NEW	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769801270190-17698012481488298893517597888953.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769801334850-17698012760197522442847447795325.webp"]	2026-01-30 19:30:19.604464	2026-01-31 00:29:43.8	\N	NONE	0	19131651755
31	53685352000194	19131651755	PRODQSW744	Flex A70 Sub	Samsung	A70	Flex Sub		20.00	2	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769864887797-17698648548094897265715063981176.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769864906689-17698648920037158299810037845330.webp"]	2026-01-31 13:10:13.502942	2026-01-31 13:10:13.502942	\N	NONE	0	19131651755
32	53685352000194	19131651755	PRODMKJ424	Flex A10s Sub	Samsung	A10S	Flex Sub		20.00	1	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769865290061-17698652725682570427649897741686.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769865307253-176986529435327590770867056940.webp"]	2026-01-31 13:18:50.802222	2026-01-31 13:18:50.802222	\N	NONE	0	19131651755
29	53685352000194	19131651755	PRODEYL678	Conector A10s M15	Samsung	A10S M15	Conector de Carga		20.00	5	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769804980579-17698049181573332508280639693423.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769805018353-17698049909408247180145114354137.webp"]	2026-01-30 20:32:19.621462	2026-01-31 13:25:44.516	\N	NONE	0	19131651755
34	53685352000194	19131651755	PRODBEK582	Conector M30	Samsung	M30	Conector de Carga		20.00	1	0	NEW	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769867083749-17698670653892744396932369966863.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769867175696-1769867092753306412739855715635.webp"]	2026-01-31 13:46:54.51794	2026-01-31 13:46:54.51794	\N	NONE	0	19131651755
35	53685352000194	19131651755	PRODQVB676	Conector A30 	Samsung	A30	Conector de Carga		20.00	2	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769868378042-17698683599508389027393325443871.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769868416377-17698683955934706049113010123321.webp"]	2026-01-31 14:07:42.785101	2026-01-31 14:07:42.785101	\N	NONE	0	19131651755
36	53685352000194	19131651755	PRODYIU023	Conector A01 Core Tipo C	Samsung	A01 CORE	Conector de Carga		20.00	6	0	NEW	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769869189951-17698691309207129387478907198847.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769869291550-17698692050582654770954932942463.webp"]	2026-01-31 14:23:03.816397	2026-01-31 14:23:03.816397	\N	NONE	0	19131651755
37	53685352000194	19131651755	PRODZDB548	Conector SM Note 10	Samsung	NOTE 10	Conector de Carga		20.00	2	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769869523403-17698694956133040074893488456022.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769869559054-17698695401594563092693787141858.webp"]	2026-01-31 14:26:47.312933	2026-01-31 14:26:47.312933	\N	NONE	0	19131651755
38	53685352000194	19131651755	PRODJJW544	Conector A51	Samsung	A51	Conector de Carga		20.00	3	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769869964548-17698699279341814442106809558686.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769869982923-17698699691812109294656475794738.webp"]	2026-01-31 14:33:49.910262	2026-01-31 14:33:49.910262	\N	NONE	0	19131651755
39	53685352000194	19131651755	PRODJER124	Conector A20	Samsung	A20	Conector de Carga		20.00	8	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769870611620-176987060120262221899952497395.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769870638963-17698706249768714458041852528491.webp"]	2026-01-31 14:44:39.915293	2026-01-31 14:44:39.915293	\N	NONE	0	19131651755
41	53685352000194	19131651755	PRODFUA150	Conector A03 Core	Samsung	A03 CORE	Conector de Carga		20.00	3	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769871856274-1769871839143853691840105279815.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769871886360-17698718676883980760632006285215.webp"]	2026-01-31 15:05:38.512659	2026-01-31 15:05:38.512659	\N	NONE	0	19131651755
42	53685352000194	19131651755	PRODRAS143	Conector A02 	Samsung	A02	Conector de Carga		20.00	9	0	NEW	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769872381182-17698723641281564333925012062907.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769872424927-17698723945937568474627490500556.webp"]	2026-01-31 15:15:34.411103	2026-01-31 15:15:34.411103	\N	NONE	0	19131651755
40	53685352000194	19131651755	PRODZER702	Conector A12	Samsung	A12	Conector de Carga		20.00	4	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769871480814-17698714469508395029109607842227.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769871519413-17698714920353571925786905105726.webp"]	2026-01-31 14:59:19.788911	2026-01-31 15:16:23.318	\N	NONE	0	19131651755
43	53685352000194	19131651755	PRODBJS440	Conector A02	Samsung	A02	Conector de Carga		20.00	3	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769872846233-17698728125964936450018659863889.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769872909978-17698728543672425095381506826255.webp"]	2026-01-31 15:22:28.697761	2026-01-31 15:22:28.697761	\N	NONE	0	19131651755
44	53685352000194	19131651755	PRODDPA350	Conector SM Note 10 Lite	Samsung	NOTE 10 LITE	Conector de Carga		20.00	1	0	NEW	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769873099409-17698730251733020007207776108538.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769873133223-17698731048293353899411200190550.webp"]	2026-01-31 15:27:23.210961	2026-01-31 15:27:23.210961	\N	NONE	0	19131651755
45	53685352000194	19131651755	PRODDNE678	Conector A04s	Samsung	A04S	Conector de Carga		20.00	1	0	NEW	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769873349403-17698732765198891342430839508436.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769873375230-17698733570702476516918461769152.webp"]	2026-01-31 15:30:11.207414	2026-01-31 15:30:11.207414	\N	NONE	0	19131651755
49	53685352000194	19131651755	PRODNUO067	Conector A02s	Samsung	A02S	Conector de Carga		20.00	1	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769875180448-17698751610588912836823086185864.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769875207267-17698751858867010290933029884204.webp"]	2026-01-31 16:00:53.81414	2026-01-31 18:13:18.012	\N	NONE	0	19131651755
48	53685352000194	19131651755	PRODCLD506	Conector A71	Samsung	A71	Conector de Carga		20.00	6	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769874720712-17698747030892502475134113931990.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769874745051-1769874725055721284434823655214.webp"]	2026-01-31 15:53:19.295142	2026-01-31 20:15:18.388	\N	NONE	0	19131651755
47	53685352000194	19131651755	PRODGOM081	Conector A30s	Samsung	A30S	Conector de Carga		20.00	1	0	NEW	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769874296846-17698742823669072154645008990860.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769874335790-17698743099382690925292410303397.webp"]	2026-01-31 15:46:24.893552	2026-01-31 20:19:28.914	\N	NONE	0	19131651755
50	53685352000194	19131651755	PRODKAF286	Conector A32 5G	Samsung	A32 5G	Conector de Carga		20.00	1	0	NEW	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769875367062-17698753167854272402820590445970.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769875399345-17698753726145463493071533786844.webp"]	2026-01-31 16:04:24.108694	2026-01-31 20:14:35.092	\N	NONE	0	19131651755
46	53685352000194	19131651755	PRODGIV897	Conector A50	Samsung	A50	Conector de Carga		20.00	7	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769873472391-17698734265946558504539223220158.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769873503812-17698734786062703728614014822604.webp"]	2026-01-31 15:35:47.308571	2026-01-31 20:22:39.513	\N	NONE	0	19131651755
53	53685352000194	19131651755	PRODKRI362	Conector A31	Samsung	A31	Conector de Carga		20.00	7	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769876180916-17698761627663126519001831368071.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769876212591-1769876190757578295535040670403.webp"]	2026-01-31 16:17:41.388936	2026-01-31 16:17:41.388936	\N	NONE	0	19131651755
54	53685352000194	19131651755	PRODKQD263	Conector A32 4G	Samsung	A32 4G	Conector de Carga		20.00	3	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769876594482-1769876573705375776728464412797.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769876641066-17698766036973181770586268847853.webp"]	2026-01-31 16:25:10.521158	2026-01-31 16:25:10.521158	\N	NONE	0	19131651755
57	53685352000194	19131651755	PRODWAE914	Flex de carga MT G8 Sub	Motorola	G8	Flex Sub		20.00	1	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769878453589-17698783611246368300124052655016.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769878525694-17698784661202613616727774726451.webp"]	2026-01-31 16:56:36.205024	2026-01-31 16:56:36.205024	\N	NONE	0	19131651755
60	53685352000194	19131651755	PRODSHD995	Conector MT E6 Play	Motorola	E6 PLAY	Conector de Carga		20.00	8	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769881126440-17698811038505713973836792842793.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769881165938-17698811335575356206258346365075.webp"]	2026-01-31 17:40:57.784573	2026-01-31 17:40:57.784573	\N	NONE	0	19131651755
62	53685352000194	19131651755	PRODHZY660	Conector E5 Play	Motorola	E5 PLAY	Conector de Carga		20.00	5	0	NEW	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769881560838-1769881535774955712428164218543.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769881596652-17698815645088235819221456119074.webp"]	2026-01-31 17:47:29.198701	2026-01-31 17:47:29.198701	\N	NONE	0	19131651755
67	53685352000194	19131651755	PRODLWF512	Conector MT E6 Plus	Motorola	E6 PLUS	Conector de Carga		20.00	1	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769882825470-17698828066488740495821329985671.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769882845269-17698828317854679785415527921439.webp"]	2026-01-31 18:08:27.711029	2026-01-31 18:08:27.711029	\N	NONE	0	19131651755
63	53685352000194	19131651755	PRODPTB766	Conector MT One	Motorola	ONE	Conector de Carga		20.00	6	0	NEW	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769881692182-17698816617165726391027977390377.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769881718328-17698816958457854440073920768241.webp"]	2026-01-31 17:49:25.407518	2026-01-31 18:05:41.213	\N	NONE	0	19131651755
68	53685352000194	19131651755	PRODGWA536	Conector MT E7 Power	Motorola	E7 POWER	Conector de Carga		20.00	3	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769883113484-1769883100597890481060195036317.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769883142686-17698831156324110952564446403712.webp"]	2026-01-31 18:13:16.594432	2026-01-31 18:13:16.594432	\N	NONE	0	19131651755
95	53685352000194	19131651755	PRODWHD081	Conector Xiaomi M3	Xiaomi	M3	Conector de Carga		20.00	1	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770064820496-17700648007399167503952869926817.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770064852850-17700648264067786786429402923056.webp"]	2026-02-02 20:42:01.299359	2026-02-02 20:42:01.299359	\N	NONE	0	19131651755
55	53685352000194	19131651755	PRODVOQ826	Conector A15 4G	Samsung	A15 4G	Conector de Carga		20.00	3	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769876903112-17698768013786657584168949122620.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769876944925-17698769104384937399367110136595.webp"]	2026-01-31 16:29:53.297637	2026-01-31 18:12:21.306	\N	NONE	0	19131651755
66	53685352000194	19131651755	PRODFGP205	Conector E4 Plus	Motorola	E4 PLUS	Conector de Carga		20.00	13	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769882417021-17698823972721259238050307551443.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769882452158-1769882422561419369807476810178.webp"]	2026-01-31 18:02:17.512257	2026-01-31 18:09:10.018	\N	NONE	0	19131651755
58	53685352000194	19131651755	PRODLND087	Flex MT One Macro Sub	Motorola	ONE MACRO	Flex Sub		20.00	5	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769880751246-17698807281252772175648217160746.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769880769734-17698807547301941268308197097242.webp"]	2026-01-31 17:34:27.39566	2026-01-31 20:13:51.918	\N	NONE	0	19131651755
61	53685352000194	19131651755	PRODKUZ466	Conector One Fusion 	Motorola	ONE FUSION	Conector de Carga		20.00	1	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769881383135-17698813602797010743985117898578.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769881434506-17698813896366717877431340179381.webp"]	2026-01-31 17:45:15.098437	2026-01-31 18:10:32.209	\N	NONE	0	19131651755
56	53685352000194	19131651755	PRODSYY187	Flex MT One Fusion Main	Motorola	ONE FUSION	Flex Main		20.00	1	0	NEW	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769877973402-17698778260025935242592263985864.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769878028869-17698779787263911530194924017187.webp"]	2026-01-31 16:49:35.595257	2026-01-31 18:12:16.793	\N	NONE	0	19131651755
51	53685352000194	19131651755	PRODZTU197	Conector A20s M14	Samsung	A20S M14	Conector de Carga		20.00	1	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769875643525-17698756157137954369164842885846.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769875765874-17698757335665140656492705476826.webp"]	2026-01-31 16:10:44.202726	2026-01-31 20:14:35.11	\N	NONE	0	19131651755
69	53685352000194	19131651755	PRODTMQ294	Conector MT G5	Motorola	G5	Conector de Carga		20.00	4	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769883244932-17698832265006574757775254816811.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769883276391-17698832481538627655074390960542.webp"]	2026-01-31 18:15:15.69727	2026-01-31 18:15:15.69727	\N	NONE	0	19131651755
70	53685352000194	19131651755	PRODNOA378	Conector MT G8 Play	Motorola	G8 PLAY	Conector de Carga		20.00	2	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769883383915-17698833728262447741448126857675.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769883396870-17698833870007165091670525495853.webp"]	2026-01-31 18:17:44.399207	2026-01-31 18:17:44.399207	\N	NONE	0	19131651755
64	53685352000194	19131651755	PRODQKS724	Conector MT G7 Play	Motorola	E7 PLAY	Conector de Carga		20.00	3	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769881943890-17698819034713151978932736684248.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769881990986-17698819476864583369565704351526.webp"]	2026-01-31 17:55:18.103127	2026-01-31 20:13:42.293	\N	NONE	0	19131651755
71	53685352000194	19131651755	PRODLMF126	Conector  MT One Macro 	Motorola	ONE MACRO	Conector de Carga		20.00	8	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769883549765-17698835181423389589411221033216.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769883597256-17698835527994302498331091991820.webp"]	2026-01-31 18:21:06.496242	2026-01-31 18:21:06.496242	\N	NONE	0	19131651755
73	53685352000194	19131651755	PRODHAJ032	Conector MT E6 Plus	Motorola	E6 PLUS	Conector de Carga		20.00	4	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769884034720-17698840114784980774889088388101.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769884054145-17698840374968931526770103095995.webp"]	2026-01-31 18:28:20.994686	2026-01-31 18:28:20.994686	\N	NONE	0	19131651755
74	53685352000194	19131651755	PRODBPE491	Conector MT G8 Plus	Motorola	G8 PLUS	Conector de Carga		20.00	9	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769884146075-17698841316864799346388962811671.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769884169770-17698841494357252594902187688439.webp"]	2026-01-31 18:30:36.61044	2026-01-31 18:30:36.61044	\N	NONE	0	19131651755
75	53685352000194	19131651755	PRODBZT960	Conector MT E6s	Motorola	E6S	Conector de Carga		20.00	5	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769884316118-17698842897007908218028018744627.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769884344935-17698843205071533223995589573320.webp"]	2026-01-31 18:33:03.212281	2026-01-31 18:33:03.212281	\N	NONE	0	19131651755
76	53685352000194	19131651755	PRODLJB855	Conector MT G8 Power	Motorola	G8 POWER	Conector de Carga		20.00	3	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769884430237-17698844064601382281864261333529.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769884453530-17698844357296381824518865871472.webp"]	2026-01-31 18:35:29.200854	2026-01-31 18:35:29.200854	\N	NONE	0	19131651755
77	53685352000194	19131651755	PRODVEU932	Conector MT G7 Power	Motorola	G7 POWER	Conector de Carga		20.00	6	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769884575650-17698845584899085937375959073244.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769884594787-17698845800367126026529333320989.webp"]	2026-01-31 18:37:27.510438	2026-01-31 18:37:27.510438	\N	NONE	0	19131651755
86	53685352000194	19131651755	PRODNZA653	Flex Redmi 8A Sub	Xiaomi	8A	Flex Sub		20.00	1	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770061708035-1770061686725712508581639292472.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770061855649-17700618095013123135068953514365.webp"]	2026-02-02 19:51:54.111038	2026-02-02 19:51:54.111038	\N	NONE	0	19131651755
65	53685352000194	19131651755	PRODLKE033	Auricular Quadrada Universal 	Samsung	TODOS	Alto-falante Auricular		5.00	1	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769882210403-17698821465841624215694158006956.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769882250418-17698822147715547669021517422029.webp"]	2026-01-31 17:59:25.296261	2026-01-31 20:07:56.804	\N	NONE	0	19131651755
106	53685352000194	19131651755	PRODNAR104	Câmera traseira A20 	Samsung	A20	Câmera Traseira		40.00	1	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770130818360-17701308037332875846956477712757.webp"]	2026-02-03 15:00:58.136327	2026-02-03 15:00:58.136327	\N	NONE	0	19131651755
78	53685352000194	19131651755	PRODLWW626	Conector MT G10/G20 	Motorola	G10	Conector de Carga		20.00	2	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769884704569-17698846897583106905799904614257.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769884731833-17698847158662694001346882356886.webp"]	2026-01-31 18:40:08.786101	2026-01-31 20:06:05.692	\N	NONE	0	19131651755
80	53685352000194	19131651755	PRODHLC934	Conector MT One Action	Motorola	ONE ACTION	Conector de Carga		20.00	1	0	NEW	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769884999642-17698849790127414265842076523479.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769885024534-17698850027386202379464015231725.webp"]	2026-01-31 18:44:51.499697	2026-02-02 18:56:19.295	\N	NONE	0	19131651755
81	53685352000194	19131651755	PRODWHM958	Flex A31 Main	Samsung	A31	Flex Main		20.00	3	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770059413814-17700593867215852412216906543360.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770059475972-17700594518733497662380322332589.webp"]	2026-02-02 19:12:34.302038	2026-02-02 19:12:34.302038	\N	NONE	0	19131651755
72	53685352000194	19131651755	PRODFYK775	Conector MT G8 Power Lite	Motorola	G8 POWER LITE	Conector de Carga		20.00	1	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769883754663-17698837224412778646518058334620.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769883864484-17698837577773123483089168925876.webp"]	2026-01-31 18:25:53.002548	2026-01-31 20:06:30.696	\N	NONE	0	19131651755
87	53685352000194	19131651755	PRODLCI230	Conector Redmi 8A	Xiaomi	8A	Conector de Carga		20.00	1	0	NEW	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770062041323-17700620071895496953068556973353.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770062088921-17700620465104257357454596154210.webp"]	2026-02-02 19:56:53.416593	2026-02-02 19:56:53.416593	\N	NONE	0	19131651755
82	53685352000194	19131651755	PRODCAV852	Flex RD Note 8 Sub	Xiaomi	NOTE 8	Flex Sub		20.00	3	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770059873686-17700598297711916202754720628140.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770059917719-17700598867022882341228694919751.webp"]	2026-02-02 19:22:11.213142	2026-02-02 19:22:11.213142	\N	NONE	0	19131651755
79	53685352000194	19131651755	PRODJQC300	Conector MT E5 Plus	Motorola	E5 PLUS	Conector de Carga		20.00	7	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769884846141-17698848224332182378009154854586.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1769884889250-17698848486884026812107434301273.webp"]	2026-01-31 18:42:13.191384	2026-01-31 20:13:12.111	\N	NONE	0	19131651755
83	53685352000194	19131651755	PRODQYF605	Flex RD Note 12 4G Main	Xiaomi	NOTE 12 4G	Flex Main		20.00	1	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770060355644-17700603377415263114265634471853.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770060387899-17700603600494053577273343847916.webp"]	2026-02-02 19:29:51.223275	2026-02-02 19:29:51.223275	\N	NONE	0	19131651755
84	53685352000194	19131651755	PRODEDW737	Flex Redmi Note 7/ PRO  Sub	Xiaomi	NOTE 7	Flex Sub		20.00	1	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770060684159-17700606342965837970655849501584.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770060706831-17700606891045711996277867687603.webp"]	2026-02-02 19:38:43.930831	2026-02-02 19:38:43.930831	\N	NONE	0	19131651755
85	53685352000194	19131651755	PRODYER980	Flex Redmi Note 9s/9Pro Sub	Xiaomi	NOTE 9S	Flex Sub		20.00	1	0	NEW	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770061162430-17700611297705909500521336702153.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770061192318-17700611758384413317836703083779.webp"]	2026-02-02 19:41:14.850272	2026-02-02 19:41:14.850272	\N	NONE	0	19131651755
88	53685352000194	19131651755	PRODRAR748	Conector Redmi 9A/9C/10A	Xiaomi	9A	Conector de Carga		20.00	2	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770062357404-17700622906083275571824305800316.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770062396783-17700623642958457355831469096059.webp"]	2026-02-02 20:01:20.721686	2026-02-02 20:01:20.721686	\N	NONE	0	19131651755
89	53685352000194	19131651755	PRODIMK724	Conector Note 10 Pri	Xiaomi	NOTE 10 PRO	Conector de Carga		20.00	1	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770062843873-1770062820197117674173136049737.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770062863522-17700628512131288912720099763839.webp"]	2026-02-02 20:09:27.182918	2026-02-02 20:09:27.182918	\N	NONE	0	19131651755
90	53685352000194	19131651755	PRODQZP992	Conector Redmi Note 8	Xiaomi	NOTE 8	Conector de Carga		20.00	1	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770063095004-17700630695332088696580428207990.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770063117738-1770063099434199590850453045000.webp"]	2026-02-02 20:12:54.283877	2026-02-02 20:12:54.283877	\N	NONE	0	19131651755
91	53685352000194	19131651755	PRODGZV198	Conector Redmi 10	Xiaomi	10	Conector de Carga		20.00	1	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770063385113-17700632692531718148217763717893.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770063434791-17700633881731267528164537519055.webp"]	2026-02-02 20:18:10.904982	2026-02-02 20:18:10.904982	\N	NONE	0	19131651755
92	53685352000194	19131651755	PRODWOY208	Conector Xiaomi Mi A2/6X	Xiaomi	A2	Conector de Carga		20.00	1	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770064036783-17700639841423590283503584382048.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770064101967-17700640442535056755218682858858.webp"]	2026-02-02 20:29:55.901838	2026-02-02 20:29:55.901838	\N	NONE	0	19131651755
93	53685352000194	19131651755	PRODZGE399	Conector Redmi Note 7	Xiaomi	NOTE 7	Conector de Carga		20.00	2	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770064302859-1770064277483768594078021098691.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770064341129-17700643064697483175374226788670.webp"]	2026-02-02 20:33:40.705847	2026-02-02 20:33:40.705847	\N	NONE	0	19131651755
94	53685352000194	19131651755	PRODWOA126	Conector Redmi 9t	Xiaomi	9T	Conector de Carga		20.00	1	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770064602105-17700645449882470577202980869062.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770064678340-17700646072718097911451412371085.webp"]	2026-02-02 20:38:56.111447	2026-02-02 20:38:56.111447	\N	NONE	0	19131651755
96	53685352000194	19131651755	PRODPIV618	Conector Xiaomi Mi 8 Lite	Xiaomi	MI 8 LITE	Conector de Carga		20.00	1	0	NEW	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770065012117-17700649931465272108103786082394.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770065214971-1770065089038848602824145856200.webp"]	2026-02-02 20:48:53.290317	2026-02-03 12:14:22.513	\N	NONE	0	19131651755
97	53685352000194	19131651755	PRODIFK192	Câmera Traseira Iphone 13	Apple	13	Câmera Traseira		180.00	2	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770126795246-17701267291377676349526174087240.webp"]	2026-02-03 13:54:33.940698	2026-02-03 13:54:33.940698	\N	NONE	0	19131651755
99	53685352000194	19131651755	PRODTTC163	Auricular Iphone 13	Apple	13	Alto-falante Auricular		45.00	1	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770128543931-17701285306435070128108612230464.webp","https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770128583773-17701285510706059456085452923453.webp"]	2026-02-03 14:24:37.651028	2026-02-03 14:24:37.651028	\N	NONE	0	19131651755
98	53685352000194	19131651755	PRODPRK653	Câmera frontal Iphone 13	Apple	13	Câmera Frontal		100.00	2	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770128195001-17701281501346861287967483372373.webp"]	2026-02-03 14:17:24.336361	2026-02-03 14:25:26.147	\N	NONE	0	19131651755
100	53685352000194	19131651755	PRODOGE579	Flex Auricular Iphone 13	Apple	13	Biometria		50.00	1	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770129013855-17701289644936022049168306671914.webp"]	2026-02-03 14:32:04.927705	2026-02-03 14:32:04.927705	\N	NONE	0	19131651755
101	53685352000194	19131651755	PRODCIG899	Gaveta de chip Iphone 13	Apple	13	Carcaça		30.00	1	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770129226993-17701292143832045559227822558933.webp"]	2026-02-03 14:35:54.735371	2026-02-03 14:35:54.735371	\N	NONE	0	19131651755
102	53685352000194	19131651755	PRODCZB974	Câmera Traseira  Iphone 11	Apple	11	Câmera Traseira		100.00	1	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770129441095-17701294168948685223729849594876.webp"]	2026-02-03 14:38:43.557279	2026-02-03 14:38:43.557279	\N	NONE	0	19131651755
103	53685352000194	19131651755	PRODJSB452	Câmera traseira Iphone 7/8 Plus 	Apple	8 PLUS 	Câmera Traseira		50.00	2	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770129620906-17701295614442684254266209630305.webp"]	2026-02-03 14:41:58.640298	2026-02-03 14:41:58.640298	\N	NONE	0	19131651755
104	53685352000194	19131651755	PRODSQK573	Câmera traseira A10s	Samsung	A10S	Câmera Traseira		40.00	1	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770130023310-1770130008282490745723131829005.webp"]	2026-02-03 14:50:55.052355	2026-02-03 14:50:55.052355	\N	NONE	0	19131651755
105	53685352000194	19131651755	PRODZRS192	Câmera traseira Redmi 9A	Xiaomi	9A	Câmera Traseira		40.00	1	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770130366586-17701303047758204823445275838817.webp"]	2026-02-03 14:54:09.328189	2026-02-03 14:54:09.328189	\N	NONE	0	19131651755
107	53685352000194	19131651755	PRODFTI934	Câmera frontal A02s	Samsung	A02S	Câmera Frontal		25.00	1	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770131031823-1770130934921570425912928441036.webp"]	2026-02-03 15:06:29.230834	2026-02-03 15:06:29.230834	\N	NONE	0	19131651755
108	53685352000194	19131651755	PRODARL068	Câmera frontal A50	Samsung	A50	Câmera Frontal		25.00	1	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770131297861-17701312684958612019720912996840.webp"]	2026-02-03 15:08:43.048775	2026-02-03 15:08:43.048775	\N	NONE	0	19131651755
109	53685352000194	19131651755	PRODEFU801	Câmera frontal A30	Samsung	A30	Câmera Frontal		25.00	1	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770131409438-17701313718227100036019267256841.webp"]	2026-02-03 15:10:55.037291	2026-02-03 15:10:55.037291	\N	NONE	0	19131651755
110	53685352000194	19131651755	PRODKLH549	Câmera traseira A21s	Samsung	A21S	Câmera Traseira		40.00	1	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770131624269-17701315571642943042206800759166.webp"]	2026-02-03 15:15:21.734264	2026-02-03 15:15:21.734264	\N	NONE	0	19131651755
111	53685352000194	19131651755	PRODHYA469	Câmera frontal A21s	Samsung	A21S	Câmera Frontal		25.00	1	0	ORIGINAL_RETIRADA	["https://banco.avelarcompany.dev.br/storage/v1/object/public/public/products/1770131757091-17701317333836617606364851882820.webp"]	2026-02-03 15:16:29.124249	2026-02-03 15:16:29.124249	\N	NONE	0	19131651755
\.


--
-- Data for Name: ratings; Type: TABLE DATA; Schema: avelar_stocktech; Owner: -
--

COPY avelar_stocktech.ratings (id, account_id, reviewer_id, product_id, transaction_id, rating, comment, author, created_at, updated_at) FROM stdin;
5	53685352000194	19131651755	9	21	4	Fazendo teste	Cliente	2026-01-31 20:12:38.494715	2026-01-31 20:12:38.494715
\.


--
-- Data for Name: seller_profiles; Type: TABLE DATA; Schema: avelar_stocktech; Owner: -
--

COPY avelar_stocktech.seller_profiles (id, account_id, user_id, store_name, email, phone, city, state, profile_photo, cover_photo, description, rating, total_sales, total_sales_amount, total_products, total_reviews, followers, response_time, street, number, neighborhood, zip_code, latitude, longitude, created_at, updated_at, owner_cpf) FROM stdin;
6	53685352000194	19131651755	Avelar Company	\N	+5527988180948	Vila velha 	ES	https://banco.avelarcompany.dev.br/storage/v1/object/public/public/sellers/profile/1769707548448-thecnology_logo_3d_no_text_polished_silver.webp	\N	Avelar Company trazendo as melhores soluções  empresariais e tecnológicas para seu negócio	0.00	0	0.00	0	0	0	\N	\N	\N	\N	\N	\N	\N	2026-01-28 14:15:59.990517	2026-01-29 17:42:36.295	19131651755
7	51276706000111	86552410590	Rodrigo dos Santos Silva 	\N	+5527988361444	\N	\N	\N	\N	\N	0.00	0	0.00	0	0	0	\N	\N	\N	\N	\N	\N	\N	2026-01-30 13:37:05.514103	2026-01-30 13:37:05.514103	86552410590
5	32716071000181	13617126782	Rodrigo Cajueiro Wenceslau	\N	+5527999731064	\N	\N	\N	\N	\N	0.00	0	0.00	0	0	0	\N	\N	\N	\N	\N	\N	\N	2026-01-27 19:05:18.900745	2026-01-29 18:33:35.406	13617126782
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: avelar_stocktech; Owner: -
--

COPY avelar_stocktech.transactions (id, account_id, buyer_id, seller_id, transaction_code, type, product_id, product_name, counterparty, counterparty_role, amount, quantity, status, date, created_at, updated_at, owner_cpf) FROM stdin;
\.


--
-- Data for Name: user_preferences; Type: TABLE DATA; Schema: avelar_stocktech; Owner: -
--

COPY avelar_stocktech.user_preferences (id, account_id, user_id, email_notifications, marketing_offers, data_sharing, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: avelar_stocktech; Owner: -
--

COPY avelar_stocktech.users (id, document_type, document, business_name, owner_cpf, is_individual, whatsapp, status, enabled_modules, previous_document, plan_id, client_type, last_sync_at, created_at, updated_at) FROM stdin;
53685352000194	cnpj	53685352000194	Avelar Company	19131651755	f	+5527988180948	active	["StockTech", "AxCellOS"]	\N	e6fc8bda-3ba8-4249-ab61-60ee3f046029	lojista	2026-02-21 19:29:54.501	2026-02-10 01:12:43.929	2026-02-21 19:29:54.501
\.


--
-- Data for Name: users_backup_20260210; Type: TABLE DATA; Schema: avelar_stocktech; Owner: -
--

COPY avelar_stocktech.users_backup_20260210 (open_id, name, email, login_method, last_signed_in, created_at, updated_at) FROM stdin;
19131651755	Estevan R. Avelar	19131651755	avadmin	2026-02-05 19:54:07.283+00	2026-01-28 14:05:03.779079+00	2026-02-05 19:54:07.283+00
86552410590	Rodrigo dos Santos Silva 	86552410590	avadmin	2026-01-30 13:34:32.904+00	2026-01-30 13:32:14.60152+00	2026-01-30 13:34:32.904+00
13617126782	Rodrigo Cajueiro Wenceslau	13617126782	avadmin	2026-02-09 17:12:35.052+00	2026-01-27 19:05:01.005452+00	2026-02-09 17:12:35.052+00
\.


--
-- Name: addresses_id_seq; Type: SEQUENCE SET; Schema: avelar_stocktech; Owner: -
--

SELECT pg_catalog.setval('avelar_stocktech.addresses_id_seq', 9, true);


--
-- Name: brands_id_seq; Type: SEQUENCE SET; Schema: avelar_stocktech; Owner: -
--

SELECT pg_catalog.setval('avelar_stocktech.brands_id_seq', 5, true);


--
-- Name: carts_id_seq; Type: SEQUENCE SET; Schema: avelar_stocktech; Owner: -
--

SELECT pg_catalog.setval('avelar_stocktech.carts_id_seq', 98, true);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: avelar_stocktech; Owner: -
--

SELECT pg_catalog.setval('avelar_stocktech.orders_id_seq', 14, true);


--
-- Name: product_conditions_id_seq; Type: SEQUENCE SET; Schema: avelar_stocktech; Owner: -
--

SELECT pg_catalog.setval('avelar_stocktech.product_conditions_id_seq', 4, true);


--
-- Name: product_parts_id_seq; Type: SEQUENCE SET; Schema: avelar_stocktech; Owner: -
--

SELECT pg_catalog.setval('avelar_stocktech.product_parts_id_seq', 22, true);


--
-- Name: product_returns_id_seq; Type: SEQUENCE SET; Schema: avelar_stocktech; Owner: -
--

SELECT pg_catalog.setval('avelar_stocktech.product_returns_id_seq', 3, true);


--
-- Name: product_types_id_seq; Type: SEQUENCE SET; Schema: avelar_stocktech; Owner: -
--

SELECT pg_catalog.setval('avelar_stocktech.product_types_id_seq', 6, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: avelar_stocktech; Owner: -
--

SELECT pg_catalog.setval('avelar_stocktech.products_id_seq', 122, true);


--
-- Name: ratings_id_seq; Type: SEQUENCE SET; Schema: avelar_stocktech; Owner: -
--

SELECT pg_catalog.setval('avelar_stocktech.ratings_id_seq', 5, true);


--
-- Name: seller_profiles_id_seq; Type: SEQUENCE SET; Schema: avelar_stocktech; Owner: -
--

SELECT pg_catalog.setval('avelar_stocktech.seller_profiles_id_seq', 7, true);


--
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: avelar_stocktech; Owner: -
--

SELECT pg_catalog.setval('avelar_stocktech.transactions_id_seq', 32, true);


--
-- Name: user_preferences_id_seq; Type: SEQUENCE SET; Schema: avelar_stocktech; Owner: -
--

SELECT pg_catalog.setval('avelar_stocktech.user_preferences_id_seq', 1, false);


--
-- Name: addresses addresses_pkey; Type: CONSTRAINT; Schema: avelar_stocktech; Owner: -
--

ALTER TABLE ONLY avelar_stocktech.addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);


--
-- Name: brands brands_name_key; Type: CONSTRAINT; Schema: avelar_stocktech; Owner: -
--

ALTER TABLE ONLY avelar_stocktech.brands
    ADD CONSTRAINT brands_name_key UNIQUE (name);


--
-- Name: brands brands_pkey; Type: CONSTRAINT; Schema: avelar_stocktech; Owner: -
--

ALTER TABLE ONLY avelar_stocktech.brands
    ADD CONSTRAINT brands_pkey PRIMARY KEY (id);


--
-- Name: brands brands_slug_key; Type: CONSTRAINT; Schema: avelar_stocktech; Owner: -
--

ALTER TABLE ONLY avelar_stocktech.brands
    ADD CONSTRAINT brands_slug_key UNIQUE (slug);


--
-- Name: carts carts_pkey; Type: CONSTRAINT; Schema: avelar_stocktech; Owner: -
--

ALTER TABLE ONLY avelar_stocktech.carts
    ADD CONSTRAINT carts_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_code_unique; Type: CONSTRAINT; Schema: avelar_stocktech; Owner: -
--

ALTER TABLE ONLY avelar_stocktech.orders
    ADD CONSTRAINT orders_order_code_unique UNIQUE (order_code);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: avelar_stocktech; Owner: -
--

ALTER TABLE ONLY avelar_stocktech.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: product_conditions product_conditions_pkey; Type: CONSTRAINT; Schema: avelar_stocktech; Owner: -
--

ALTER TABLE ONLY avelar_stocktech.product_conditions
    ADD CONSTRAINT product_conditions_pkey PRIMARY KEY (id);


--
-- Name: product_conditions product_conditions_value_key; Type: CONSTRAINT; Schema: avelar_stocktech; Owner: -
--

ALTER TABLE ONLY avelar_stocktech.product_conditions
    ADD CONSTRAINT product_conditions_value_key UNIQUE (value);


--
-- Name: product_parts product_parts_pkey; Type: CONSTRAINT; Schema: avelar_stocktech; Owner: -
--

ALTER TABLE ONLY avelar_stocktech.product_parts
    ADD CONSTRAINT product_parts_pkey PRIMARY KEY (id);


--
-- Name: product_parts product_parts_slug_key; Type: CONSTRAINT; Schema: avelar_stocktech; Owner: -
--

ALTER TABLE ONLY avelar_stocktech.product_parts
    ADD CONSTRAINT product_parts_slug_key UNIQUE (slug);


--
-- Name: product_returns product_returns_pkey; Type: CONSTRAINT; Schema: avelar_stocktech; Owner: -
--

ALTER TABLE ONLY avelar_stocktech.product_returns
    ADD CONSTRAINT product_returns_pkey PRIMARY KEY (id);


--
-- Name: product_returns product_returns_return_code_key; Type: CONSTRAINT; Schema: avelar_stocktech; Owner: -
--

ALTER TABLE ONLY avelar_stocktech.product_returns
    ADD CONSTRAINT product_returns_return_code_key UNIQUE (return_code);


--
-- Name: product_types product_types_pkey; Type: CONSTRAINT; Schema: avelar_stocktech; Owner: -
--

ALTER TABLE ONLY avelar_stocktech.product_types
    ADD CONSTRAINT product_types_pkey PRIMARY KEY (id);


--
-- Name: product_types product_types_slug_key; Type: CONSTRAINT; Schema: avelar_stocktech; Owner: -
--

ALTER TABLE ONLY avelar_stocktech.product_types
    ADD CONSTRAINT product_types_slug_key UNIQUE (slug);


--
-- Name: products products_code_unique; Type: CONSTRAINT; Schema: avelar_stocktech; Owner: -
--

ALTER TABLE ONLY avelar_stocktech.products
    ADD CONSTRAINT products_code_unique UNIQUE (code);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: avelar_stocktech; Owner: -
--

ALTER TABLE ONLY avelar_stocktech.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: ratings ratings_pkey; Type: CONSTRAINT; Schema: avelar_stocktech; Owner: -
--

ALTER TABLE ONLY avelar_stocktech.ratings
    ADD CONSTRAINT ratings_pkey PRIMARY KEY (id);


--
-- Name: seller_profiles seller_profiles_pkey; Type: CONSTRAINT; Schema: avelar_stocktech; Owner: -
--

ALTER TABLE ONLY avelar_stocktech.seller_profiles
    ADD CONSTRAINT seller_profiles_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: avelar_stocktech; Owner: -
--

ALTER TABLE ONLY avelar_stocktech.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_transaction_code_unique; Type: CONSTRAINT; Schema: avelar_stocktech; Owner: -
--

ALTER TABLE ONLY avelar_stocktech.transactions
    ADD CONSTRAINT transactions_transaction_code_unique UNIQUE (transaction_code);


--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: avelar_stocktech; Owner: -
--

ALTER TABLE ONLY avelar_stocktech.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: avelar_stocktech; Owner: -
--

ALTER TABLE ONLY avelar_stocktech.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: carts_reserved_until_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX carts_reserved_until_idx ON avelar_stocktech.carts USING btree (reserved_until) WHERE (reserved_until IS NOT NULL);


--
-- Name: idx_brands_display_order; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX idx_brands_display_order ON avelar_stocktech.brands USING btree (display_order);


--
-- Name: idx_brands_is_active; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX idx_brands_is_active ON avelar_stocktech.brands USING btree (is_active);


--
-- Name: idx_brands_slug; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX idx_brands_slug ON avelar_stocktech.brands USING btree (slug);


--
-- Name: idx_orders_owner_cpf; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX idx_orders_owner_cpf ON avelar_stocktech.orders USING btree (owner_cpf);


--
-- Name: idx_product_conditions_active; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX idx_product_conditions_active ON avelar_stocktech.product_conditions USING btree (is_active);


--
-- Name: idx_product_conditions_display_order; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX idx_product_conditions_display_order ON avelar_stocktech.product_conditions USING btree (display_order);


--
-- Name: idx_product_conditions_value; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX idx_product_conditions_value ON avelar_stocktech.product_conditions USING btree (value);


--
-- Name: idx_product_parts_active; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX idx_product_parts_active ON avelar_stocktech.product_parts USING btree (is_active);


--
-- Name: idx_product_parts_display_order; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX idx_product_parts_display_order ON avelar_stocktech.product_parts USING btree (display_order);


--
-- Name: idx_product_parts_slug; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX idx_product_parts_slug ON avelar_stocktech.product_parts USING btree (slug);


--
-- Name: idx_product_returns_owner_cpf; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX idx_product_returns_owner_cpf ON avelar_stocktech.product_returns USING btree (owner_cpf);


--
-- Name: idx_product_types_active; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX idx_product_types_active ON avelar_stocktech.product_types USING btree (is_active);


--
-- Name: idx_product_types_display_order; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX idx_product_types_display_order ON avelar_stocktech.product_types USING btree (display_order);


--
-- Name: idx_product_types_slug; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX idx_product_types_slug ON avelar_stocktech.product_types USING btree (slug);


--
-- Name: idx_products_owner_cpf; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX idx_products_owner_cpf ON avelar_stocktech.products USING btree (owner_cpf);


--
-- Name: idx_seller_profiles_owner_cpf; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX idx_seller_profiles_owner_cpf ON avelar_stocktech.seller_profiles USING btree (owner_cpf);


--
-- Name: idx_transactions_owner_cpf; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX idx_transactions_owner_cpf ON avelar_stocktech.transactions USING btree (owner_cpf);


--
-- Name: idx_users_client_type; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX idx_users_client_type ON avelar_stocktech.users USING btree (client_type);


--
-- Name: idx_users_document; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX idx_users_document ON avelar_stocktech.users USING btree (document);


--
-- Name: idx_users_owner_cpf; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX idx_users_owner_cpf ON avelar_stocktech.users USING btree (owner_cpf);


--
-- Name: orders_account_id_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX orders_account_id_idx ON avelar_stocktech.orders USING btree (account_id);


--
-- Name: orders_account_status_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX orders_account_status_idx ON avelar_stocktech.orders USING btree (account_id, status);


--
-- Name: orders_buyer_created_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX orders_buyer_created_idx ON avelar_stocktech.orders USING btree (buyer_id, created_at);


--
-- Name: orders_buyer_id_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX orders_buyer_id_idx ON avelar_stocktech.orders USING btree (buyer_id);


--
-- Name: orders_created_at_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX orders_created_at_idx ON avelar_stocktech.orders USING btree (created_at);


--
-- Name: orders_order_code_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX orders_order_code_idx ON avelar_stocktech.orders USING btree (order_code);


--
-- Name: orders_parent_order_code_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX orders_parent_order_code_idx ON avelar_stocktech.orders USING btree (parent_order_code);


--
-- Name: orders_seller_created_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX orders_seller_created_idx ON avelar_stocktech.orders USING btree (seller_id, created_at);


--
-- Name: orders_seller_id_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX orders_seller_id_idx ON avelar_stocktech.orders USING btree (seller_id);


--
-- Name: orders_status_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX orders_status_idx ON avelar_stocktech.orders USING btree (status);


--
-- Name: product_returns_account_id_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX product_returns_account_id_idx ON avelar_stocktech.product_returns USING btree (account_id);


--
-- Name: product_returns_buyer_id_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX product_returns_buyer_id_idx ON avelar_stocktech.product_returns USING btree (buyer_id);


--
-- Name: product_returns_created_at_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX product_returns_created_at_idx ON avelar_stocktech.product_returns USING btree (created_at);


--
-- Name: product_returns_order_id_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX product_returns_order_id_idx ON avelar_stocktech.product_returns USING btree (order_id);


--
-- Name: product_returns_product_id_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX product_returns_product_id_idx ON avelar_stocktech.product_returns USING btree (product_id);


--
-- Name: product_returns_seller_id_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX product_returns_seller_id_idx ON avelar_stocktech.product_returns USING btree (seller_id);


--
-- Name: product_returns_status_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX product_returns_status_idx ON avelar_stocktech.product_returns USING btree (status);


--
-- Name: products_account_category_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX products_account_category_idx ON avelar_stocktech.products USING btree (account_id, category);


--
-- Name: products_account_created_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX products_account_created_idx ON avelar_stocktech.products USING btree (account_id, created_at);


--
-- Name: products_account_id_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX products_account_id_idx ON avelar_stocktech.products USING btree (account_id);


--
-- Name: products_brand_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX products_brand_idx ON avelar_stocktech.products USING btree (brand);


--
-- Name: products_category_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX products_category_idx ON avelar_stocktech.products USING btree (category);


--
-- Name: products_code_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX products_code_idx ON avelar_stocktech.products USING btree (code);


--
-- Name: products_created_at_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX products_created_at_idx ON avelar_stocktech.products USING btree (created_at);


--
-- Name: products_name_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX products_name_idx ON avelar_stocktech.products USING btree (name);


--
-- Name: products_search_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX products_search_idx ON avelar_stocktech.products USING btree (name, brand, category);


--
-- Name: products_warranty_period_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX products_warranty_period_idx ON avelar_stocktech.products USING btree (warranty_period);


--
-- Name: transactions_account_date_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX transactions_account_date_idx ON avelar_stocktech.transactions USING btree (account_id, date);


--
-- Name: transactions_account_id_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX transactions_account_id_idx ON avelar_stocktech.transactions USING btree (account_id);


--
-- Name: transactions_buyer_date_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX transactions_buyer_date_idx ON avelar_stocktech.transactions USING btree (buyer_id, date);


--
-- Name: transactions_buyer_id_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX transactions_buyer_id_idx ON avelar_stocktech.transactions USING btree (buyer_id);


--
-- Name: transactions_created_at_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX transactions_created_at_idx ON avelar_stocktech.transactions USING btree (created_at);


--
-- Name: transactions_date_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX transactions_date_idx ON avelar_stocktech.transactions USING btree (date);


--
-- Name: transactions_product_id_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX transactions_product_id_idx ON avelar_stocktech.transactions USING btree (product_id);


--
-- Name: transactions_seller_date_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX transactions_seller_date_idx ON avelar_stocktech.transactions USING btree (seller_id, date);


--
-- Name: transactions_seller_id_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX transactions_seller_id_idx ON avelar_stocktech.transactions USING btree (seller_id);


--
-- Name: transactions_status_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX transactions_status_idx ON avelar_stocktech.transactions USING btree (status);


--
-- Name: transactions_type_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX transactions_type_idx ON avelar_stocktech.transactions USING btree (type);


--
-- Name: user_preferences_account_id_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX user_preferences_account_id_idx ON avelar_stocktech.user_preferences USING btree (account_id);


--
-- Name: user_preferences_account_user_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX user_preferences_account_user_idx ON avelar_stocktech.user_preferences USING btree (account_id, user_id);


--
-- Name: user_preferences_user_id_idx; Type: INDEX; Schema: avelar_stocktech; Owner: -
--

CREATE INDEX user_preferences_user_id_idx ON avelar_stocktech.user_preferences USING btree (user_id);


--
-- Name: product_conditions trigger_product_conditions_updated_at; Type: TRIGGER; Schema: avelar_stocktech; Owner: -
--

CREATE TRIGGER trigger_product_conditions_updated_at BEFORE UPDATE ON avelar_stocktech.product_conditions FOR EACH ROW EXECUTE FUNCTION avelar_stocktech.update_updated_at_column();


--
-- Name: product_parts trigger_product_parts_updated_at; Type: TRIGGER; Schema: avelar_stocktech; Owner: -
--

CREATE TRIGGER trigger_product_parts_updated_at BEFORE UPDATE ON avelar_stocktech.product_parts FOR EACH ROW EXECUTE FUNCTION avelar_stocktech.update_updated_at_column();


--
-- Name: product_types trigger_product_types_updated_at; Type: TRIGGER; Schema: avelar_stocktech; Owner: -
--

CREATE TRIGGER trigger_product_types_updated_at BEFORE UPDATE ON avelar_stocktech.product_types FOR EACH ROW EXECUTE FUNCTION avelar_stocktech.update_updated_at_column();


--
-- Name: product_returns product_returns_order_id_fkey; Type: FK CONSTRAINT; Schema: avelar_stocktech; Owner: -
--

ALTER TABLE ONLY avelar_stocktech.product_returns
    ADD CONSTRAINT product_returns_order_id_fkey FOREIGN KEY (order_id) REFERENCES avelar_stocktech.orders(id) ON DELETE CASCADE;


--
-- Name: product_returns product_returns_product_id_fkey; Type: FK CONSTRAINT; Schema: avelar_stocktech; Owner: -
--

ALTER TABLE ONLY avelar_stocktech.product_returns
    ADD CONSTRAINT product_returns_product_id_fkey FOREIGN KEY (product_id) REFERENCES avelar_stocktech.products(id) ON DELETE CASCADE;


--
-- Name: product_returns product_returns_transaction_id_fkey; Type: FK CONSTRAINT; Schema: avelar_stocktech; Owner: -
--

ALTER TABLE ONLY avelar_stocktech.product_returns
    ADD CONSTRAINT product_returns_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES avelar_stocktech.transactions(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict fn0deYoEfYAJd1zaaML87sUfdHIyTORYxHdME2wYQlpokmWOiQAwVdoz3ICVeKC

