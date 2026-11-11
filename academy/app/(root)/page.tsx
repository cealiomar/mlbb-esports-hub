/**
 * A static host cannot run middleware, so the root is a prerendered page
 * that sends the visitor to the Arabic site, the default for this audience.
 */
export default function RootPage() {
  return (
    <>
      <meta httpEquiv="refresh" content="0; url=./ar/" />
      <p style={{ padding: 24, fontFamily: 'system-ui' }}>
        <a href="./ar/">MPL MENA Academy</a>
      </p>
    </>
  )
}
