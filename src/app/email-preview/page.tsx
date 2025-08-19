'use client'

export default function EmailPreview() {
  const fullName = "Sarah Johnson"
  const company = "InfoWorks"
  const signupUrl = "http://localhost:3001/auth/signup?email=sarah@example.com"

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
          <h1 className="text-2xl font-bold mb-4">📧 Email Preview</h1>
          <p className="text-gray-600 mb-4">This is exactly what your coworker will receive:</p>
          <div className="border-2 border-gray-300 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-2">
              <strong>From:</strong> onboarding@resend.dev<br/>
              <strong>Subject:</strong> 🚀 Exclusive Access: The Greatest Project Management App Ever Built
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg">
          {/* Email Content */}
          <div style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", lineHeight: "1.6", color: "#333", margin: "0", padding: "0", backgroundColor: "#f5f5f5" }}>
            <div style={{ maxWidth: "600px", margin: "0 auto", backgroundColor: "white", padding: "40px", borderRadius: "10px", boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)", marginTop: "20px", marginBottom: "20px" }}>
              <div style={{ textAlign: "center", marginBottom: "30px" }}>
                <div style={{ backgroundColor: "#1C2B45", color: "white", padding: "15px 25px", borderRadius: "8px", display: "inline-block", fontSize: "24px", fontWeight: "bold", marginBottom: "20px" }}>InfoWorks</div>
                <h1 style={{ color: "#1C2B45", marginBottom: "10px" }}>📧 You've Got Mail... And It's About To Change Everything</h1>
              </div>
              
              <div style={{ backgroundColor: "#f8f9ff", padding: "20px", borderRadius: "8px", borderLeft: "4px solid #1C2B45", margin: "20px 0" }}>
                <h2 style={{ marginTop: "0" }}>🏆 Introducing: Project Pulse</h2>
                <p><strong>The Greatest Project Management App Ever Developed™</strong></p>
                <p>Hi {fullName}! You've been selected for exclusive early access to Project Pulse - the revolutionary platform that's about to make Excel-based project management as outdated as fax machines.</p>
              </div>

              <h3>🚀 Why Project Pulse Will Change Your Life:</h3>
              <ul>
                <li><strong>🎯 Drag & Drop Roadmaps:</strong> Building project timelines has never been this satisfying</li>
                <li><strong>📊 Real-Time Client Dashboards:</strong> No more "What's the status?" emails at 5 PM on Friday</li>
                <li><strong>🔒 Secure Client Access:</strong> They see their projects, not your other clients' secrets</li>
                <li><strong>⚡ Instant Updates:</strong> Because carrier pigeons are so last century</li>
                <li><strong>🎨 Professional Reporting:</strong> Make even the most boring project look impressive</li>
              </ul>

              <div style={{ backgroundColor: "#fff3cd", border: "2px solid #ffeaa7", padding: "20px", borderRadius: "8px", margin: "20px 0" }}>
                <h3>⚠️ Important Reality Check:</h3>
                <p><strong>This app is still in its infancy stage!</strong></p>
                <p>Think of it as a very smart baby - it can do amazing things, but it's still learning to walk. We haven't even styled it properly yet (hence the basic look), and you might encounter some quirks. But that's what makes you a pioneer! 🎖️</p>
                <p><em>Translation: It works great, but don't expect fancy animations... yet.</em></p>
              </div>

              {company && (
                <p><strong>🏢 Your Mission at {company}:</strong><br/>
                Help us test this masterpiece while managing your projects like the PM rockstar you are!</p>
              )}

              <div style={{ backgroundColor: "#e8f5e8", padding: "15px", borderRadius: "8px", margin: "20px 0", borderLeft: "4px solid #28a745" }}>
                <h3>🤣 Dad Joke Break:</h3>
                <p><em>Why don't project managers ever get lost?</em></p>
                <p><strong>Because they always have a roadmap!</strong> 🗺️</p>
                <p>(You'll appreciate this more once you start using our roadmap builder)</p>
              </div>

              <div style={{ textAlign: "center", margin: "30px 0" }}>
                <a href={signupUrl} style={{ display: "inline-block", backgroundColor: "#1C2B45", color: "white", padding: "15px 30px", textDecoration: "none", borderRadius: "8px", fontWeight: "bold", margin: "20px 0" }}>
                  🚀 Get My VIP Access Now
                </a>
              </div>

              <h3>🎯 What Happens Next:</h3>
              <ol>
                <li><strong>Click the button above</strong> - your email is already filled in because we're efficient like that</li>
                <li><strong>Create your account</strong> - it takes less time than making coffee</li>
                <li><strong>Set up your first project</strong> - go wild, pick something fun!</li>
                <li><strong>Build a roadmap</strong> - seriously, you'll be addicted to the drag-and-drop</li>
                <li><strong>Generate a client link</strong> - watch their minds get blown by transparency</li>
              </ol>

              <div style={{ backgroundColor: "#f8f9ff", padding: "20px", borderRadius: "8px", borderLeft: "4px solid #1C2B45", margin: "20px 0" }}>
                <p><strong>🔥 Limited Time Offer:</strong> You're getting access to the future of project management before anyone else. This is basically like getting the iPhone before it was cool, except for project management.</p>
              </div>

              <div style={{ marginTop: "30px", paddingTop: "20px", borderTop: "1px solid #eee", fontSize: "14px", color: "#666" }}>
                <p><strong>Questions? Found a bug? Just excited?</strong><br/>
                Reply to this email or hunt down the admin who invited you for high-fives.</p>
                
                <p style={{ marginTop: "20px", fontStyle: "italic", color: "#888" }}>
                  P.S. - Once your clients start receiving these beautiful project updates, you'll become their favorite person. Prepare for thank-you emails! 📬
                </p>
                
                <p style={{ marginTop: "15px", fontSize: "12px", color: "#999" }}>
                  This invitation expires in 7 days, but why wait? The sooner you start, the sooner you'll wonder how you ever lived without Project Pulse.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-lg mt-6">
          <h2 className="text-xl font-bold mb-4">👀 What do you think?</h2>
          <p className="text-gray-600">This is the exact email your coworker will receive. It includes:</p>
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Professional marketing tone</li>
            <li>Clear reality check about beta status</li>
            <li>Dad joke about roadmaps 😄</li>
            <li>Direct signup link with pre-filled email</li>
            <li>InfoWorks branding</li>
          </ul>
        </div>
      </div>
    </div>
  )
}