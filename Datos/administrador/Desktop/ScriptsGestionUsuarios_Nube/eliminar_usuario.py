
import os
import shutil
import ctypes

def es_admin():
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False

def main():
    if not es_admin():
        print("❌ Debes ejecutar este programa como administrador.")
        input("Presiona ENTER para salir...")
        return

    print("🗑 Eliminar usuario")
    usuario = input("Nombre del usuario a eliminar: ")

    origen = f'C:\\NubeDistribuible_v2\\Datos\\{usuario}'
    destino = f'C:\\NubeDistribuible_v2\\Datos-borrados\\datos_de_{usuario}'

    if os.path.exists(origen):
        os.makedirs('C:\\NubeDistribuible_v2\\Datos-borrados', exist_ok=True)
        shutil.move(origen, destino)
        print(f"📁 Datos movidos a {destino}")
    else:
        print("⚠️ No se encontró la carpeta del usuario.")

    os.system(f'net user {usuario} /delete')
    print("✅ Usuario eliminado de Windows.")
    input("Presiona ENTER para finalizar.")

if __name__ == "__main__":
    main()
