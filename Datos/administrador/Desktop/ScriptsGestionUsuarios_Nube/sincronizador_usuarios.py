
import os
import shutil
import time

def copiar_directorio(origen, destino, excluir=[]):
    for carpeta_raiz, subdirs, archivos in os.walk(origen):
        # Omitir rutas excluidas
        if any(ex in carpeta_raiz for ex in excluir):
            continue

        carpeta_destino = carpeta_raiz.replace(origen, destino, 1)
        if not os.path.exists(carpeta_destino):
            os.makedirs(carpeta_destino, exist_ok=True)

        for archivo in archivos:
            if archivo in ["desktop.ini"]: continue
            archivo_origen = os.path.join(carpeta_raiz, archivo)
            archivo_destino = os.path.join(carpeta_destino, archivo)

            try:
                shutil.copy2(archivo_origen, archivo_destino)
            except Exception:
                pass  # Ignorar archivos que no se puedan copiar

def sincronizar_usuario(usuario):
    origen = f"C:\\Users\\{usuario}"
    destino = f"C:\\NubeDistribuible_v2\\Datos\\{usuario}"
    excluir = ["AppData", "NTUSER", "OneDrive"]

    copiar_directorio(origen, destino, excluir)

def obtener_usuarios_activos():
    datos_path = "C:\\NubeDistribuible_v2\\Datos\\usuarios.txt"
    if not os.path.exists(datos_path):
        return []
    with open(datos_path, "r", encoding="utf-8") as f:
        return [linea.split(":")[0].strip() for linea in f if ":" in linea]

if __name__ == "__main__":
    print("🔄 Sincronizador de usuarios iniciado (cada 30 segundos)...")
    while True:
        usuarios = obtener_usuarios_activos()
        for usuario in usuarios:
            sincronizar_usuario(usuario)
        time.sleep(30)
