import {
  buildBoardroomEmailLookup,
  crmMyshopifyDomain,
  isEligibleShopifyEmailCandidate,
  lookupBoardroomEmail,
} from '../api/_lib/boardroom-emails.ts'
import { collectBoardroomShopifyDomains } from '../api/_lib/boardroom-crm-api.ts'

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

const users = [
  {
    id: '1',
    email: 'customer@example.com',
    shopifyDomains: collectBoardroomShopifyDomains({
      shopify_shop_domains: ['https://FOO.myshopify.com'],
      stores: [{ type: 'shopify', shopify_shop_domain: 'foo.myshopify.com' }],
    }),
  },
  {
    id: '2',
    email: 'multi@example.com',
    shopifyDomains: collectBoardroomShopifyDomains({
      shopify_shop_domains: ['store-a.myshopify.com', 'store-b.myshopify.com'],
      stores: [
        { type: 'shopify', shopify_shop_domain: 'store-a.myshopify.com' },
        { type: 'amazon', shopify_shop_domain: 'not-shopify.myshopify.com' },
      ],
    }),
  },
  {
    id: '10',
    email: 'one@example.com',
    shopifyDomains: ['dup.myshopify.com'],
  },
  {
    id: '11',
    email: 'two@example.com',
    shopifyDomains: ['dup.myshopify.com'],
  },
  {
    id: '12',
    email: null,
    shopifyDomains: ['no-email.myshopify.com'],
  },
]

const lookup = buildBoardroomEmailLookup(users)

// Case A — normal match, including CRM URL format
{
  const domain = crmMyshopifyDomain('https://foo.myshopify.com', null)
  const match = lookupBoardroomEmail(lookup, domain)
  assertEqual(match.status, 'match', 'A status')
  assert(match.status === 'match' && match.email === 'customer@example.com', 'A email')
  console.log('PASS Case A — normal match')
}

// Case B — no match
{
  const domain = crmMyshopifyDomain('missing.myshopify.com', null)
  const match = lookupBoardroomEmail(lookup, domain)
  assertEqual(match.status, 'no_match', 'B status')
  console.log('PASS Case B — no match')
}

// Case C — CRM already has email
{
  const gate = isEligibleShopifyEmailCandidate({
    billing_channel: 'shopify',
    email: 'existing@example.com',
  })
  assertEqual(gate.eligible, false, 'C eligible')
  assertEqual(gate.alreadyHadEmail, true, 'C alreadyHadEmail')
  console.log('PASS Case C — already has email')
}

// Case D — multiple Boardroom users
{
  const match = lookupBoardroomEmail(lookup, 'dup.myshopify.com')
  assertEqual(match.status, 'ambiguous', 'D status')
  console.log('PASS Case D — ambiguous')
}

// Case E — one Boardroom user, multiple stores
{
  const a = lookupBoardroomEmail(lookup, 'store-a.myshopify.com')
  const b = lookupBoardroomEmail(lookup, 'store-b.myshopify.com')
  assert(a.status === 'match' && a.email === 'multi@example.com', 'E store-a')
  assert(b.status === 'match' && b.email === 'multi@example.com', 'E store-b')
  assert(a.status === 'match' && b.status === 'match' && a.userId === b.userId, 'E same user')
  console.log('PASS Case E — one user, multiple stores')
}

// Case F — custom domain, no MyShopify host
{
  const domain = crmMyshopifyDomain(null, 'https://acmegoods.com')
  assertEqual(domain, null, 'F domain')
  const match = lookupBoardroomEmail(lookup, domain)
  assertEqual(match.status, 'no_match', 'F status')
  console.log('PASS Case F — custom domain')
}

// Case G — Stripe customer
{
  const gate = isEligibleShopifyEmailCandidate({
    billing_channel: 'stripe',
    email: null,
  })
  assertEqual(gate.eligible, false, 'G eligible')
  assertEqual(gate.skippedStripe, true, 'G skippedStripe')
  console.log('PASS Case G — Stripe skipped')
}

{
  const amazonIgnored = collectBoardroomShopifyDomains({
    shopify_shop_domains: [],
    stores: [{ type: 'amazon', shopify_shop_domain: 'amazon-store.myshopify.com' }],
  })
  assertEqual(amazonIgnored.length, 0, 'non-shopify stores ignored')
  const missingEmail = lookupBoardroomEmail(lookup, 'no-email.myshopify.com')
  assertEqual(missingEmail.status, 'missing_email', 'missing boardroom email')
  console.log('PASS extra — missing Boardroom email and non-Shopify stores')
}

console.log('All Boardroom email matching cases passed')
