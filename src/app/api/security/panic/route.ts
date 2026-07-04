import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { noStoreJson } from "@/lib/security";
import { cookies } from "next/headers";

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { confirmation } = await request.json();
    if (confirmation !== "DELETE EVERYTHING") {
      return noStoreJson({ error: "Invalid confirmation string" }, { status: 400 });
    }

    // A true Panic Mode in a Zero-Knowledge system should wipe all data related to the user
    // First, wipe keys (making existing encrypted data permanently inaccessible even if backups exist)
    await prisma.userKey.deleteMany({ where: { user_id: user.id } });

    // Then, wipe all data tables (Due to Cascade deletes in the schema, deleting the user would wipe everything, 
    // but the user might want to keep the account shell while wiping the sensitive data. Let's just wipe data for now).
    
    // Wipe Passwords
    await prisma.passwordEntry.deleteMany({ where: { user_id: user.id } });
    
    // Wipe Vault Files
    await prisma.vaultFile.deleteMany({ where: { user_id: user.id } });
    await prisma.vaultFolder.deleteMany({ where: { user_id: user.id } });
    
    // Wipe Notes
    await prisma.note.deleteMany({ where: { user_id: user.id } });
    
    // Wipe Tasks
    await prisma.taskBoard.deleteMany({ where: { user_id: user.id } });
    
    // Wipe Chats
    await prisma.message.deleteMany({ where: { sender_id: user.id } });
    
    // Wipe all active sessions (logging the user out)
    await prisma.session.deleteMany({ where: { user_id: user.id } });

    // Clear session cookies to force local logout
    const cookieStore = await cookies();
    cookieStore.delete('zyphor_session');

    // Create an alert that Panic Mode was triggered
    await prisma.securityAlert.create({
      data: {
        user_id: user.id,
        type: "PANIC_MODE_TRIGGERED",
        message: "Panic Mode was activated. All sensitive data has been purged.",
        severity: "CRITICAL"
      }
    });

    return noStoreJson({ success: true, message: "Panic Mode activated. All data purged." });
  } catch (error) {
    console.error("Error triggering Panic Mode:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}
