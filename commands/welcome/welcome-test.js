const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { checkPermissions } = require('../../utils/permissions');
const { welcome } = require('../../utils/database');
const Canvas = require('canvas');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcome-test')
        .setDescription('Test the welcome system')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to test the welcome message with (defaults to you)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    async execute(interaction) {
        if (!checkPermissions(interaction, [PermissionFlagsBits.ManageGuild])) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Permission Denied', 'You need the Manage Server permission to use this command.')],
                ephemeral: true
            });
        }
        
        const user = interaction.options.getUser('user') || interaction.user;
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        
        if (!member) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'User not found in this server.')],
                ephemeral: true
            });
        }
        
        try {
            const settings = welcome.getSettings(interaction.guild.id);
            
            if (!settings.channelId) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Setup Required', 'Please set up the welcome system first using `/welcome-setup`.')],
                    ephemeral: true
                });
            }
            
            const channel = await interaction.guild.channels.fetch(settings.channelId).catch(() => null);
            
            if (!channel) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Invalid Channel', 'The welcome channel no longer exists. Please update it using `/welcome-setup`.')],
                    ephemeral: true
                });
            }
            
            // Send a test welcome message
            await interaction.deferReply();
            
            if (settings.useImage) {
                const canvas = Canvas.createCanvas(1024, 500);
                const ctx = canvas.getContext('2d');
                
                // Draw background
                ctx.fillStyle = '#23272A';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Draw welcome text
                ctx.font = 'bold 60px sans-serif';
                ctx.fillStyle = settings.color || '#7289DA';
                ctx.textAlign = 'center';
                ctx.fillText('Welcome to the Server!', canvas.width / 2, 100);
                
                // Draw username
                ctx.font = 'bold 40px sans-serif';
                ctx.fillStyle = '#FFFFFF';
                ctx.fillText(user.tag, canvas.width / 2, 180);
                
                // Draw server name
                ctx.font = '30px sans-serif';
                ctx.fillText(`You are member #${interaction.guild.memberCount}`, canvas.width / 2, 240);
                
                // Draw avatar
                ctx.beginPath();
                ctx.arc(canvas.width / 2, 350, 100, 0, Math.PI * 2, true);
                ctx.closePath();
                ctx.clip();
                
                const avatar = await Canvas.loadImage(user.displayAvatarURL({ extension: 'png', size: 256 }));
                ctx.drawImage(avatar, canvas.width / 2 - 100, 250, 200, 200);
                
                const attachment = { attachment: canvas.toBuffer(), name: 'welcome.png' };
                
                const welcomeMessage = settings.message
                    .replace(/{user}/g, user.toString())
                    .replace(/{server}/g, interaction.guild.name);
                
                const welcomeEmbed = createSuccessEmbed(
                    'Welcome Test',
                    welcomeMessage
                )
                .setImage('attachment://welcome.png')
                .setColor(settings.color || '#7289DA');
                
                await channel.send({ embeds: [welcomeEmbed], files: [attachment] });
            } else {
                const welcomeMessage = settings.message
                    .replace(/{user}/g, user.toString())
                    .replace(/{server}/g, interaction.guild.name);
                
                const welcomeEmbed = createSuccessEmbed(
                    'Welcome Test',
                    welcomeMessage
                )
                .setColor(settings.color || '#7289DA');
                
                await channel.send({ embeds: [welcomeEmbed] });
            }
            
            // Test DM if enabled
            if (settings.dmEnabled) {
                try {
                    const dmMessage = settings.dmMessage
                        .replace(/{user}/g, user.username)
                        .replace(/{server}/g, interaction.guild.name);
                    
                    const dmEmbed = createSuccessEmbed(
                        `Welcome to ${interaction.guild.name}`,
                        dmMessage
                    )
                    .setColor(settings.color || '#7289DA');
                    
                    if (user.id === interaction.user.id) {
                        await user.send({ embeds: [dmEmbed] });
                    } else {
                        await interaction.followUp({ 
                            embeds: [createSuccessEmbed('DM Test', 'DM would be sent to the user, but was skipped for this test.')],
                            ephemeral: true
                        });
                    }
                } catch (error) {
                    console.error('Could not send DM:', error);
                    
                    await interaction.followUp({ 
                        embeds: [createErrorEmbed('DM Error', 'Could not send a DM to the user. They may have DMs disabled.')],
                        ephemeral: true
                    });
                }
            }
            
            const embed = createSuccessEmbed(
                'Welcome Test Complete',
                `A test welcome message has been sent to ${channel}.`
            );
            
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error testing welcome system:', error);
            
            await interaction.editReply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while testing the welcome system.')],
                ephemeral: true
            });
        }
    }
};