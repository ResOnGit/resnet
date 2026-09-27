export function Lights() {
  return (
    <>
      <ambientLight intensity={0.07} />
      <hemisphereLight args={["#f4f4f4", "#000000", 0.18]} />
      <directionalLight position={[7, 22, 11]} intensity={2.15} />
      <directionalLight position={[-12, 5, -8]} intensity={0.28} />
    </>
  );
}
