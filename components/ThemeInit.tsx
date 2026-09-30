export default function ThemeInit() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){try{var s=localStorage.getItem("badminton-split-theme");var d=s?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";}catch(e){}})();`,
      }}
    />
  );
}
